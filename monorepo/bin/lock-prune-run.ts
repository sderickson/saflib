#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

/**
 * Standalone lock-prune entry, kept for product repos whose preinstall hook
 * still runs it (`--yes`). New product repos don't add that hook.
 *
 * Avoids loading the full saf-monorepo CLI so it doesn't depend on commander
 * being resolvable from the saflib submodule path.
 */
import { runLockPrune } from "../src/product-lock-prune.ts";

const fix =
  process.argv.includes("--fix") ||
  process.argv.includes("--yes") ||
  process.argv.includes("-y");
const rootIdx = process.argv.indexOf("--root");
const rootDir = rootIdx >= 0 ? process.argv[rootIdx + 1] : undefined;

const exitCode = await runLockPrune({ rootDir, fix });
process.exit(exitCode);
