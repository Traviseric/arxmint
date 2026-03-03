#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const [scriptPath, ...scriptArgs] = process.argv.slice(2);

if (!scriptPath) {
  console.error("[run-bash] usage: node scripts/run-bash.cjs <script-path> [args...]");
  process.exit(2);
}

const candidates = [];

if (process.env.BASH_PATH) {
  candidates.push(process.env.BASH_PATH);
}

candidates.push("bash");

if (process.platform === "win32") {
  candidates.push("C:\\Program Files\\Git\\bin\\bash.exe");
  candidates.push("C:\\Program Files\\Git\\usr\\bin\\bash.exe");
}

for (const candidate of candidates) {
  const result = spawnSync(candidate, [scriptPath, ...scriptArgs], {
    cwd: repoRoot,
    stdio: "inherit",
  });

  if (result.error && result.error.code === "ENOENT") {
    continue;
  }

  if (result.error) {
    console.error(`[run-bash] failed to run ${candidate}: ${result.error.message}`);
    process.exit(1);
  }

  process.exit(result.status ?? 1);
}

console.error(
  "[run-bash] no bash runtime found. Set BASH_PATH or install Git Bash."
);
process.exit(1);
