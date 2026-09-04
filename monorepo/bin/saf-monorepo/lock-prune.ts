import type { Command } from "commander";
import { runLockPrune } from "../../src/product-lock-prune.ts";

export const configureLockPruneCommand = (command: Command) => {
  return command
    .option("--root <dir>", "product monorepo root (default: auto-detect)")
    .option("-y, --yes", "apply fixes without prompting")
    .action(async (options: { root?: string; yes?: boolean }) => {
      const exitCode = await runLockPrune({
        rootDir: options.root,
        yes: options.yes,
      });
      process.exit(exitCode);
    });
};

export const addLockPruneCommand = (program: Command) => {
  configureLockPruneCommand(
    program
      .command("lock-prune")
      .description(
        "Prune stale product lockfile entries and verify embedded saflib workspace hygiene.",
      ),
  );
};
