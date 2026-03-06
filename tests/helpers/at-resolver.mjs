/**
 * Custom module resolve hook for Node.js test runner.
 * Maps TypeScript path alias @/* to the project root so that
 * modules like lsp-bootstrap.ts (which import "@/lib/logger") can
 * load in the test environment without a bundler or TSConfig path loader.
 *
 * Usage in a test file (before dynamic import of module under test):
 *   import { register } from "node:module";
 *   register(new URL("./helpers/at-resolver.mjs", import.meta.url));
 *   const { myFn } = await import("../lib/my-module.ts");
 */

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { existsSync } from "node:fs";

// Resolve project root: tests/helpers/ → two levels up → project root
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "../..");

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const relative = specifier.slice(2); // e.g. "lib/logger"

    // Try .ts extension first (TypeScript source), then .js, then bare path
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
  return nextResolve(specifier, context);
}
