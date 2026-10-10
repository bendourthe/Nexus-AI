#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { renderHandbook } from "./handbook-renderer.mjs";

const root = process.cwd();
const handbookRoot = join(root, "docs", "handbooks");
const sources = [join(handbookRoot, "markdown"), join(handbookRoot, "technical")];
const outputOption = process.argv.indexOf("--output-root");
if (outputOption >= 0 && (!process.argv[outputOption + 1] || process.argv[outputOption + 1].startsWith("--"))) {
  console.error("generate-handbooks: --output-root requires a directory");
  process.exit(1);
}
const outputRoot = outputOption >= 0 ? resolve(process.argv[outputOption + 1]) : join(handbookRoot, "html");
const checkOnly = process.argv.includes("--check");

function markdownFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => join(entry.parentPath, entry.name));
}

function outputPath(source) {
  const section = sources.find((candidate) => source.startsWith(candidate));
  const prefix = section === sources[1] ? "technical" : "";
  return join(outputRoot, prefix, relative(section, source).replace(/\.md$/i, ".html"));
}

function render(source) {
  return renderHandbook(source, root);
}

const files = sources.flatMap(markdownFiles).sort();
if (files.length === 0) {
  console.error("generate-handbooks: no Markdown sources found");
  process.exit(1);
}

const drift = [];
for (const source of files) {
  const target = outputPath(source);
  const expected = render(source);
  if (checkOnly) {
    if (!existsSync(target) || readFileSync(target, "utf8") !== expected) {
      drift.push(relative(root, target));
    }
    continue;
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, expected, "utf8");
}

if (drift.length > 0) {
  console.error(`generate-handbooks: ${drift.length} generated file(s) are missing or stale`);
  for (const file of drift) console.error(`  - ${file}`);
  process.exit(1);
}

console.log(`generate-handbooks: ${files.length} source(s) ${checkOnly ? "match" : "generated"}`);
