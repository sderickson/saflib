#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

/**
 * Standalone lock-prune entry for product preinstall hooks.
 *
 * Avoids loading the full saf-monorepo CLI so preinstall does not depend on
 * commander being resolvable from the saflib submodule path.
 */
import { runLockPrune } from "../src/product-lock-prune.ts";

const yes = process.argv.includes("--yes") || process.argv.includes("-y");
const check = process.argv.includes("--check");
const rootIdx = process.argv.indexOf("--root");
const rootDir = rootIdx >= 0 ? process.argv[rootIdx + 1] : undefined;

const exitCode = await runLockPrune({ rootDir, yes, check });
process.exit(exitCode);
