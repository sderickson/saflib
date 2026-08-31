#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
/**
 * After product/init copies base → product with lineReplace, skipped stub
 * `"path"` lines can leave:
 * - empty `{ }` objects (multi-line refs)
 * - trailing commas before `]` (last ref in an array was a single-line stub)
 *
 * Repair those so `saf-imports tsconfig generate` / `JSON.parse` can run.
 *
 * Usage: node strip-stub-tsconfig-refs.ts <productRoot>
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const STUB_TOKEN = /__[a-zA-Z][a-zA-Z0-9_-]*__/;

function walkTsconfigs(dir: string, out: string[] = []): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (
      entry.name === "node_modules" ||
      entry.name === "dist" ||
      entry.name === ".git"
    ) {
      continue;
    }
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkTsconfigs(full, out);
      continue;
    }
    if (
      entry.name === "tsconfig.json" ||
      entry.name === "tsconfig.app.json" ||
      entry.name === "tsconfig.node.json"
    ) {
      out.push(full);
    }
  }
  return out;
}

/** Repair common lineReplace leftovers so JSON.parse can succeed. */
export function repairTsconfigJsonText(raw: string): string {
  return raw
    .replace(/\{\s*\},?\s*/g, "")
    .replace(/,(\s*[\]}])/g, "$1");
}

export function cleanTsconfigReferences(
  config: { references?: Array<{ path?: string } | null> },
): boolean {
  if (!Array.isArray(config.references)) {
    return false;
  }
  const next = config.references.filter((ref) => {
    if (!ref || typeof ref.path !== "string" || ref.path.length === 0) {
      return false;
    }
    if (STUB_TOKEN.test(ref.path)) {
      return false;
    }
    return true;
  });
  if (next.length === config.references.length) {
    return false;
  }
  config.references = next;
  return true;
}

export function cleanTsconfigFile(filePath: string): boolean {
  let raw: string;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch {
    return false;
  }

  const repaired = repairTsconfigJsonText(raw);
  let config: { references?: Array<{ path?: string } | null> };
  try {
    config = JSON.parse(repaired) as typeof config;
  } catch {
    console.error(`skip (still invalid JSON): ${filePath}`);
    return false;
  }

  const refsChanged = cleanTsconfigReferences(config);
  const textChanged = repaired !== raw;
  if (!refsChanged && !textChanged) {
    return false;
  }
  fs.writeFileSync(filePath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
  return true;
}

function main(productRoot: string): void {
  const root = path.resolve(productRoot);
  if (!fs.existsSync(root)) {
    console.error(`Missing product root: ${root}`);
    process.exit(1);
  }

  let changed = 0;
  for (const file of walkTsconfigs(root)) {
    if (cleanTsconfigFile(file)) {
      changed += 1;
      console.log(`cleaned ${path.relative(root, file)}`);
    }
  }
  console.log(`strip-stub-tsconfig-refs: ${changed} file(s) updated`);
}

const invokedAsCli =
  process.argv[1] !== undefined &&
  path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1]);

if (invokedAsCli) {
  const productRoot = process.argv[2];
  if (!productRoot) {
    console.error("Usage: strip-stub-tsconfig-refs.ts <productRoot>");
    process.exit(1);
  }
  main(productRoot);
}
