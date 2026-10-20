// T002 probe: loopback-only Ollama measurements for one model tag.
// Usage: node probe.mjs <model> <out.json> [extraOptionsJson]
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const [model, out, extra] = process.argv.slice(2);
const BASE = "http://127.0.0.1:11434";
const extraOptions = extra ? JSON.parse(extra) : {};
const PROMPT =
  "Write a TypeScript function that returns the n-th Fibonacci number iteratively, then explain its complexity in two sentences.";

async function post(path, body) {
  const res = await fetch(BASE + path, { method: "POST", body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${path} HTTP ${res.status}: ${await res.text()}`);
  return res;
}

function gpuUsedMiB() {
  const s = execFileSync("nvidia-smi", ["--query-gpu=memory.used", "--format=csv,noheader,nounits"]).toString();
  return Number(s.trim().split(/\r?\n/)[0]);
}

function ollamaRamMiB() {
  const s = execFileSync("powershell.exe", [
    "-NoProfile",
    "-Command",
    "(Get-Process | Where-Object { $_.ProcessName -like 'ollama*' } | Measure-Object WorkingSet64 -Sum).Sum",
  ]).toString();
  return Math.round(Number(s.trim()) / 1048576);
}

async function unload() {
  await post("/api/generate", { model, keep_alive: 0, prompt: "" }).then((r) => r.text()).catch(() => {});
  await new Promise((r) => setTimeout(r, 4000));
}

async function ps() {
  const res = await fetch(BASE + "/api/ps");
  const { models } = await res.json();
  const m = models.find((x) => x.name === model || x.model === model);
  return m ? { size: m.size, size_vram: m.size_vram, context_length: m.context_length } : null;
}

async function loadAt(numCtx) {
  await unload();
  const idleGpu = gpuUsedMiB();
  const t0 = performance.now();
  const res = await post("/api/generate", {
    model,
    prompt: PROMPT,
    stream: false,
    think: false,
    options: { num_ctx: numCtx, num_predict: 256, temperature: 0, ...extraOptions },
  });
  const body = await res.json();
  const wallMs = Math.round(performance.now() - t0);
  return {
    numCtx,
    loaded: true,
    idleGpuMiB: idleGpu,
    gpuUsedMiB: gpuUsedMiB(),
    ollamaRamMiB: ollamaRamMiB(),
    ps: await ps(),
    loadMs: Math.round((body.load_duration ?? 0) / 1e6),
    wallMs,
    evalCount: body.eval_count,
    decodeTokPerSec: body.eval_duration ? +(body.eval_count / (body.eval_duration / 1e9)).toFixed(2) : null,
    promptTokPerSec: body.prompt_eval_duration
      ? +(body.prompt_eval_count / (body.prompt_eval_duration / 1e9)).toFixed(2)
      : null,
  };
}

async function streamRaw(think) {
  const res = await post("/api/chat", {
    model,
    stream: true,
    think,
    messages: [{ role: "user", content: "Is 391 prime? Answer in one sentence." }],
    options: { num_ctx: 8192, num_predict: 768, temperature: 0, ...extraOptions },
  });
  let thinking = "";
  let content = "";
  const decoder = new TextDecoder();
  let buf = "";
  for await (const chunk of res.body) {
    buf += decoder.decode(chunk, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line) continue;
      const ev = JSON.parse(line);
      thinking += ev.message?.thinking ?? "";
      content += ev.message?.content ?? "";
    }
  }
  return {
    think,
    thinkingChars: thinking.length,
    contentChars: content.length,
    contentHasThinkOpen: content.includes("<think>"),
    contentHasThinkClose: content.includes("</think>"),
    contentHead: content.slice(0, 160),
  };
}

const TOOL = {
  type: "function",
  function: {
    name: "read_file",
    description: "Read a file from the workspace",
    parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] },
  },
};

async function chatOnce(messages, tools) {
  const res = await post("/api/chat", {
    model,
    stream: false,
    think: false,
    messages,
    ...(tools ? { tools } : {}),
    options: { num_ctx: 8192, num_predict: 256, temperature: 0, ...extraOptions },
  });
  return (await res.json()).message ?? {};
}

async function toolProbes() {
  const ask = { role: "user", content: "Read the file src/index.ts." };
  const native = await chatOnce([ask], [TOOL]);
  const pythonic = await chatOnce([
    {
      role: "system",
      content:
        'You can call one tool: read_file(path: str). To call it, emit exactly <|tool_call_start|>[read_file(path="...")]<|tool_call_end|> and nothing else.',
    },
    ask,
  ]);
  const gemma = await chatOnce([
    {
      role: "system",
      content:
        'You can call one tool named read_file with a string argument path. To call it, emit exactly <|tool_call>call:read_file{path:<|"|>...<|"|>}<tool_call|> and nothing else.',
    },
    ask,
  ]);
  const summarize = (m) => ({
    toolCalls: (m.tool_calls ?? []).map((c) => ({ name: c.function?.name, args: c.function?.arguments })),
    content: (m.content ?? "").slice(0, 200),
  });
  return {
    native: summarize(native),
    pythonic: {
      ...summarize(pythonic),
      parses: /<\|tool_call_start\|>\[read_file\(path="src\/index\.ts"\)\]<\|tool_call_end\|>/.test(pythonic.content ?? ""),
    },
    gemma4: {
      ...summarize(gemma),
      parses: /<\|tool_call>call:read_file\{path:<\|"\|>src\/index\.ts<\|"\|>\}<tool_call\|>/.test(gemma.content ?? ""),
    },
  };
}

const result = { model, extraOptions, at: new Date().toISOString(), loads: [], reasoning: [], tools: null };
for (const ctx of [8192, 32768]) {
  try {
    result.loads.push(await loadAt(ctx));
  } catch (err) {
    result.loads.push({ numCtx: ctx, loaded: false, error: String(err).slice(0, 300) });
  }
}
try {
  result.reasoning.push(await streamRaw(true));
  result.reasoning.push(await streamRaw(false));
} catch (err) {
  result.reasoning.push({ error: String(err).slice(0, 300) });
}
try {
  result.tools = await toolProbes();
} catch (err) {
  result.tools = { error: String(err).slice(0, 300) };
}
await unload();
writeFileSync(out, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
