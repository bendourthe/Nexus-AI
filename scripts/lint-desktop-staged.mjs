import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const desktop = path.join(root, "desktop");
const files = process.argv.slice(2).map((file) => {
  const normalized = file.replace(/\\/g, "/");
  return normalized.startsWith("desktop/") ? normalized.slice("desktop/".length) : file;
});
if (files.length === 0) process.exit(0);
const eslintBin = path.join(root, "node_modules", "eslint", "bin", "eslint.js");
const result = spawnSync(process.execPath, [eslintBin, "--max-warnings=0", ...files], {
  cwd: desktop,
  stdio: "inherit",
});
process.exit(result.status ?? 1);
