import { createHash } from "node:crypto";
import { readFileSync, lstatSync, realpathSync, openSync, closeSync, fstatSync, statSync, writeSync, fsyncSync } from "node:fs";
import { resolve, relative, isAbsolute, sep, dirname, parse } from "node:path";

export const hash = (value) => createHash("sha256").update(value).digest("hex");
export function demand(ok, code) { if (!ok) throw new Error(code); }
export function keys(value, expected) {
  demand(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).sort().join() === [...expected].sort().join(), "INVALID_SCHEMA");
}

// Reject links and Windows junctions in every existing component, including parents.
export function safePath(root, input, missingLeaf = false) {
  const base = realpathSync(root);
  const target = resolve(root, input);
  const rel = relative(base, target);
  demand(rel && rel !== ".." && !rel.startsWith(".." + sep) && !isAbsolute(rel), "PATH_ESCAPE");
  let cursor = parse(target).root;
  const parts = target.slice(cursor.length).split(sep);
  for (let i = 0; i < parts.length; i++) {
    cursor = resolve(cursor, parts[i]);
    try { demand(!lstatSync(cursor).isSymbolicLink(), "LINK_REFUSED"); }
    catch (error) { if (!(missingLeaf && i === parts.length - 1 && error.code === "ENOENT")) throw error; }
  }
  demand(realpathSync(dirname(target)) === dirname(target), "PATH_ALIAS");
  return target;
}

export function exclusive(root, input) {
  const file = safePath(root, input, true);
  const fd = openSync(file, "wx", 0o600);
  const identity = fstatSync(fd);
  return {
    append(value) {
      safePath(root, file);
      const current = statSync(file);
      demand(current.dev === identity.dev && current.ino === identity.ino && current.nlink === 1, "OWNERSHIP_CHANGED");
      writeSync(fd, value);
      fsyncSync(fd);
    },
    close() { closeSync(fd); },
  };
}

const text = (value) => typeof value === "string" && value.length > 0;
export function load(root, contractFile) {
  const contractPath = safePath(root, contractFile);
  const bytes = readFileSync(contractPath);
  demand(hash(bytes) === readFileSync(safePath(root, contractFile + ".sha256"), "utf8").trim(), "CONTRACT_CHANGED");
  const contract = JSON.parse(bytes);
  keys(contract, ["schema", "fixtureManifest", "fixtureManifestSha256", "model", "endpoint", "options", "budgets", "skill", "adaptation", "adaptationSha256", "rubric", "rubricSha256", "hardware", "ledger", "pilot", "ancestry"]);
  demand(contract.schema === 1, "INVALID_SCHEMA");
  const endpoint = new URL(contract.endpoint);
  demand(["http:", "https:"].includes(endpoint.protocol) && ["127.0.0.1", "[::1]"].includes(endpoint.hostname) && !endpoint.username && !endpoint.password && endpoint.href === endpoint.origin + "/" && !contract.endpoint.endsWith("/"), "UNSAFE_ENDPOINT");
  keys(contract.model, ["name", "digest", "runtime"]);
  demand(contract.model.name === "gemma4:12b" && /^[a-f0-9]{64}$/.test(contract.model.digest) && text(contract.model.runtime), "INVALID_MODEL");
  keys(contract.options, ["temperature", "top_p", "top_k", "num_ctx"]);
  demand(JSON.stringify(contract.options) === JSON.stringify({ temperature: 0, top_p: 1, top_k: 1, num_ctx: 16384 }), "INVALID_OPTIONS");
  keys(contract.budgets, ["callMs", "outputChars", "calls", "activeMs", "concurrency"]);
  demand(JSON.stringify(contract.budgets) === JSON.stringify({ callMs: 120000, outputChars: 12000, calls: 20, activeMs: 3600000, concurrency: 1 }), "INVALID_BUDGET");
  keys(contract.skill, ["relativePath", "sha256"]);
  demand(contract.skill.relativePath === "developer-experience/anti-slop-editing/SKILL.md" && /^[a-f0-9]{64}$/.test(contract.skill.sha256), "INVALID_SKILL");
  demand(text(contract.adaptation) && hash(contract.adaptation) === contract.adaptationSha256, "ADAPTATION_CHANGED");
  demand(hash(JSON.stringify(contract.rubric)) === contract.rubricSha256, "RUBRIC_CHANGED");
  const manifestBytes = readFileSync(safePath(root, contract.fixtureManifest));
  demand(hash(manifestBytes) === contract.fixtureManifestSha256, "MANIFEST_CHANGED");
  const manifest = JSON.parse(manifestBytes);
  keys(manifest, ["schema", "files"]);
  keys(manifest.files, ["pilot", "heldOut"]);
  const groups = {};
  const ids = new Set();
  for (const [group, entry] of Object.entries(manifest.files)) {
    keys(entry, ["path", "sha256"]);
    const data = readFileSync(safePath(root, entry.path));
    demand(hash(data) === entry.sha256, "FIXTURE_CHANGED");
    groups[group] = JSON.parse(data);
    demand(Array.isArray(groups[group]) && groups[group].length === (group === "pilot" ? 4 : 16), "INVALID_DENOMINATOR");
    for (const item of groups[group]) {
      keys(item, ["id", "language", "genre", "kind", "draft", "editingGoal", "literals", "structures", "propositions"]);
      demand(text(item.id) && !ids.has(item.id), "DUPLICATE_ID"); ids.add(item.id);
      demand(["en", "zh"].includes(item.language) && ["email", "essay", "report", "post"].includes(item.genre) && ["edit", "clean"].includes(item.kind), "INVALID_FIXTURE");
      demand(text(item.draft) && item.draft.length <= 1500 && text(item.editingGoal) && Array.isArray(item.propositions) && item.propositions.length > 0 && item.propositions.every(text), "INVALID_FIXTURE");
      demand(Array.isArray(item.literals) && Array.isArray(item.structures), "INVALID_FIXTURE");
      for (const literal of item.literals) { keys(literal, ["text", "count"]); demand(text(literal.text) && Number.isSafeInteger(literal.count) && literal.count > 0 && occurrences(item.draft, literal.text) === literal.count, "INVALID_LITERAL"); }
      for (const structure of item.structures) { keys(structure, ["text", "count"]); demand(text(structure.text) && Number.isSafeInteger(structure.count) && occurrences(item.draft, structure.text) === structure.count, "INVALID_STRUCTURE"); }
    }
  }
  for (const language of ["en", "zh"]) for (const genre of ["email", "essay", "report", "post"]) for (const kind of ["edit", "clean"]) {
    demand(groups.heldOut.filter((i) => i.language === language && i.genre === genre && i.kind === kind).length === 1, "INVALID_BALANCE");
  }
  return { root, contractPath, contract, contractSha256: hash(bytes), manifest, ...groups };
}

export function occurrences(source, literal) { return source.split(literal).length - 1; }
export function decode(raw) {
  const string = String.raw`"(?:[^"\\\u0000-\u001f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"`;
  const changes = `\\[\\s*(?:${string}(?:\\s*,\\s*${string})*)?\\s*\\]`;
  const rewriteField = `"rewrite"\\s*:\\s*${string}`;
  const changesField = `"changes"\\s*:\\s*${changes}`;
  demand(typeof raw === "string" && raw.length <= 12000 && new RegExp(`^\\s*\\{\\s*(?:${rewriteField}\\s*,\\s*${changesField}|${changesField}\\s*,\\s*${rewriteField})\\s*\\}\\s*$`).test(raw), "INVALID_RESPONSE");
  const decoded = JSON.parse(raw);
  keys(decoded, ["rewrite", "changes"]);
  demand(typeof decoded.rewrite === "string" && Array.isArray(decoded.changes) && decoded.changes.every((s) => typeof s === "string"), "INVALID_RESPONSE");
  return { ...decoded, rawSha256: hash(raw), rewriteSha256: hash(decoded.rewrite) };
}
export function literalScore(item, rewrite) {
  return {
    literals: item.literals.map((o) => ({ ...o, observed: occurrences(rewrite, o.text), pass: occurrences(rewrite, o.text) === o.count })),
    structures: item.structures.map((o) => ({ ...o, observed: occurrences(rewrite, o.text), pass: occurrences(rewrite, o.text) === o.count })),
    semantic: "unreviewed", readability: "unreviewed",
  };
}

export function score(loaded, records) {
  demand(records[0]?.type === "run" && records[0].contractSha256 === loaded.contractSha256 && ["pilot", "heldOut"].includes(records[0].group), "RUN_MISMATCH");
  const items = loaded[records[0].group];
  const results = records.slice(1);
  demand(results.every((r) => r.type === "result" && items.some((i) => i.id === r.id) && r.contractSha256 === loaded.contractSha256), "RUN_MISMATCH");
  demand(new Set(results.map((r) => r.id)).size === results.length, "DUPLICATE_ID");
  const rows = items.map((item) => {
    const result = results.find((r) => r.id === item.id);
    if (!result || result.status !== "complete") return { id: item.id, language: item.language, genre: item.genre, status: "HOLD", reason: result?.reason ?? "MISSING" };
    try {
      demand(result.rawSha256 === hash(result.raw) && result.requestSha256 === hash(JSON.stringify(requestFor(loaded.contract, item))), "RESULT_CHANGED");
      const output = decode(result.raw);
      demand(hash(Buffer.from(result.wireBase64, "base64")) === result.wireSha256 && result.raw.length + result.thinking.length <= loaded.contract.budgets.outputChars, "RESULT_CHANGED");
      const frames = Buffer.from(result.wireBase64, "base64").toString("utf8").trim().split("\n").filter(Boolean).map(JSON.parse);
      demand(frames.length > 0 && frames.at(-1).done === true && frames.every((f) => f.message?.role === "assistant" && !f.message.tool_calls?.length && Object.keys(f.message).every((k) => ["role", "content", "thinking", "tool_calls"].includes(k))), "INVALID_WIRE");
      demand(frames.map((f) => f.message.content ?? "").join("") === result.raw && frames.map((f) => f.message.thinking ?? "").join("") === result.thinking, "RESULT_CHANGED");
      demand(Number.isSafeInteger(result.promptTokens) && result.promptTokens > 0 && Number.isSafeInteger(result.completionTokens) && result.completionTokens > 0 && result.promptTokens + result.completionTokens < loaded.contract.options.num_ctx, "CONTEXT_UNPROVEN");
      demand(output.rewriteSha256 === result.rewriteSha256 && result.done === true && result.identityBefore === loaded.contract.model.digest && result.identityAfter === loaded.contract.model.digest, "RESULT_CHANGED");
      const checked = literalScore(item, output.rewrite);
      return { id: item.id, language: item.language, genre: item.genre, status: "UNREVIEWED", exactPass: [...checked.literals, ...checked.structures].every((o) => o.pass), ...checked };
    } catch { return { id: item.id, language: item.language, genre: item.genre, status: "HOLD", reason: "INVALID_EVIDENCE" }; }
  });
  return { contractSha256: loaded.contractSha256, denominator: items.length, present: results.length, missing: items.filter((i) => !results.some((r) => r.id === i.id)).map((i) => i.id), disposition: "HOLD", semantic: "unreviewed", readability: "unreviewed", rows };
}

export function requestFor(contract, item) {
  return { model: contract.model.name, stream: true, options: contract.options, messages: [
    { role: "system", content: contract.adaptation },
    { role: "user", content: JSON.stringify({ language: item.language, genre: item.genre, editingGoal: item.editingGoal, draft: item.draft }) },
  ] };
}
