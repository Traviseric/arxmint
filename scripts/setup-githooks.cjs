#!/usr/bin/env node
const { spawnSync } = require("node:child_process");

function runGit(args) {
  return spawnSync("git", args, { encoding: "utf8" });
}

const inRepo = runGit(["rev-parse", "--is-inside-work-tree"]);
if (inRepo.status !== 0 || inRepo.stdout.trim() !== "true") {
  console.error("[setup:githooks] not inside a git repository");
  process.exit(1);
}

const target = ".githooks";
const setResult = runGit(["config", "core.hooksPath", target]);
if (setResult.status !== 0) {
  console.error("[setup:githooks] failed to set core.hooksPath");
  console.error(setResult.stderr.trim());
  process.exit(1);
}

const getResult = runGit(["config", "--get", "core.hooksPath"]);
const current = (getResult.stdout || "").trim();
if (getResult.status !== 0 || current !== target) {
  console.error("[setup:githooks] verification failed; expected .githooks");
  process.exit(1);
}

console.log("[setup:githooks] core.hooksPath=.githooks");
