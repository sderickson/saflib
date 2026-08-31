import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/** SQL FK actions that wipe dependent rows (or parents) during DROP/DELETE. */
const SQL_CASCADE_RE = /\bON\s+(DELETE|UPDATE)\s+CASCADE\b/gi;

/** Drizzle `.references(..., { onDelete: "cascade" })` (and onUpdate). */
const TS_CASCADE_RE = /\bon(?:Delete|Update)\s*:\s*["']cascade["']/gi;

export type FkCascadeViolation = {
  /** Path relative to the package root. */
  file: string;
  line: number;
  snippet: string;
};

function collectFiles(dir: string, extensions: Set<string>): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "meta" || entry === "dist") {
      continue;
    }
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...collectFiles(full, extensions));
      continue;
    }
    if (!extensions.has(path.extname(entry))) {
      continue;
    }
    if (entry.endsWith(".test.ts") || entry.endsWith(".test.js")) {
      continue;
    }
    out.push(full);
  }
  return out;
}

function scanFile(
  packageRoot: string,
  filePath: string,
  pattern: RegExp,
): FkCascadeViolation[] {
  const text = readFileSync(filePath, "utf8");
  const rel = path.relative(packageRoot, filePath);
  const violations: FkCascadeViolation[] = [];
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    pattern.lastIndex = 0;
    const match = pattern.exec(line);
    if (!match) {
      continue;
    }
    violations.push({
      file: rel,
      line: i + 1,
      snippet: line.trim(),
    });
  }
  return violations;
}

/**
 * Find FK cascade declarations in a drizzle package.
 *
 * Scans migration `.sql` files for `ON DELETE/UPDATE CASCADE` and schema
 * `.ts` files (under `schemas/` plus root `schema.ts`) for
 * `onDelete` / `onUpdate: "cascade"`.
 *
 * Cascades are banned because drizzle-kit table recreates (create, copy, drop)
 * can wipe unrelated child tables when FKs are enforced, and runtime deletes
 * should stay explicit in query code.
 */
export function findFkCascadeViolations(
  packageRoot: string,
): FkCascadeViolation[] {
  const root = path.resolve(packageRoot);
  const violations: FkCascadeViolation[] = [];

  for (const sql of collectFiles(path.join(root, "migrations"), new Set([".sql"]))) {
    violations.push(...scanFile(root, sql, SQL_CASCADE_RE));
  }

  for (const ts of collectFiles(path.join(root, "schemas"), new Set([".ts"]))) {
    violations.push(...scanFile(root, ts, TS_CASCADE_RE));
  }

  const rootSchema = path.join(root, "schema.ts");
  if (existsSync(rootSchema) && statSync(rootSchema).isFile()) {
    violations.push(...scanFile(root, rootSchema, TS_CASCADE_RE));
  }

  return violations;
}

/**
 * Throw if any migration SQL or schema TS in `packageRoot` declares FK cascades.
 * Defaults to `process.cwd()` so package tests can call it with no args.
 */
export function assertNoFkCascades(packageRoot: string = process.cwd()): void {
  const violations = findFkCascadeViolations(packageRoot);
  if (violations.length === 0) {
    return;
  }
  const details = violations
    .map((v) => `  ${v.file}:${v.line}: ${v.snippet}`)
    .join("\n");
  throw new Error(
    `FK CASCADE is not allowed (use explicit deletes in queries; drizzle table recreates can wipe child tables).\n${details}`,
  );
}
