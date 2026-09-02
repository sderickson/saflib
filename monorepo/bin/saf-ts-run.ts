#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

/**
 * Run a TypeScript file with the monorepo-standard Node flags and optional `.env`.
 *
 * Usage: saf-ts-run <script.ts> [args...]
 *
 * Loads `.env` from the current working directory when present (same as
 * `node --env-file=.env`). Always enables `--experimental-strip-types`.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const args = process.argv.slice(2);
if (args.length === 0 || args[0] === "-h" || args[0] === "--help") {
  console.error("Usage: saf-ts-run <script.ts> [args...]");
  process.exit(args.length === 0 ? 1 : 0);
}

const nodeArgs = [
  ...(existsSync(".env") ? ["--env-file=.env"] : []),
  "--experimental-strip-types",
  "--disable-warning=ExperimentalWarning",
  ...args,
];

const result = spawnSync(process.execPath, nodeArgs, { stdio: "inherit" });
process.exit(result.status ?? 1);
