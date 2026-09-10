import type { Command } from "commander";
import { runLockPrune } from "../../src/product-lock-prune.ts";

export const addLockPruneCommand = (program: Command) => {
  program
    .command("lock-prune")
    .description(
      "Prune stale product lockfile entries and verify embedded saflib workspace hygiene.",
    )
    .option("--root <dir>", "product monorepo root (default: auto-detect)")
    .option("-y, --yes", "apply fixes without prompting")
    .option("--check", "report issues and exit without applying fixes")
    .action(async (options: { root?: string; yes?: boolean; check?: boolean }) => {
      const exitCode = await runLockPrune({
        rootDir: options.root,
        yes: options.yes,
        check: options.check,
      });
      process.exit(exitCode);
    });
};
