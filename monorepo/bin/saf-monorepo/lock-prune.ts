import type { Command } from "commander";
import { runLockPrune } from "../../src/product-lock-prune.ts";

export const addLockPruneCommand = (program: Command) => {
  program
    .command("lock-prune")
    .description(
      "Report product/saflib workspace issues in an embedded product repo. --fix repairs lockfile bookkeeping (stale entries, misplaced hoists); everything else is reported for you to decide on.",
    )
    .option("--root <dir>", "product monorepo root (default: auto-detect)")
    .option("--fix", "repair the fixable issues")
    .option("-y, --yes", "same as --fix (kept for existing preinstall hooks)")
    .action(async (options: { root?: string; fix?: boolean; yes?: boolean }) => {
      const exitCode = await runLockPrune({
        rootDir: options.root,
        fix: options.fix || options.yes,
      });
      process.exit(exitCode);
    });
};
