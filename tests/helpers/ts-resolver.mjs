/**
 * Extended module resolve hook for Node.js test runner.
 *
 * Handles two cases that the default resolver misses when running
 * TypeScript source files directly with --experimental-strip-types:
 *
 *  1. Path alias @/* → project root  (same as at-resolver.mjs)
 *  2. Extensionless relative imports  e.g. "./logger" → "./logger.ts"
 *     TypeScript allows bare relative imports; Node does not resolve
 *     them to .ts automatically even with --experimental-strip-types.
 */

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync } from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");

export async function resolve(specifier, context, nextResolve) {
  // ── 1. @/ alias ─────────────────────────────────────────────────────────────
  if (specifier.startsWith("@/")) {
    const relative = specifier.slice(2);
    const candidates = [
      path.join(PROJECT_ROOT, relative + ".ts"),
      path.join(PROJECT_ROOT, relative + ".tsx"),
      path.join(PROJECT_ROOT, relative + ".js"),
      path.join(PROJECT_ROOT, relative),
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
    }
  }

  // ── 2. Extensionless relative imports  (./foo  ../bar) ──────────────────────
  if (
    (specifier.startsWith("./") || specifier.startsWith("../")) &&
    !path.extname(specifier)
  ) {
    const parentDir = context.parentURL
      ? path.dirname(fileURLToPath(context.parentURL))
      : PROJECT_ROOT;
    const abs = path.resolve(parentDir, specifier);
    const candidates = [
      abs + ".ts",
      abs + ".tsx",
      abs + ".js",
      abs + "/index.ts",
      abs + "/index.js",
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
    }
  }

  return nextResolve(specifier, context);
}
