#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

import { Command } from "commander";
import { setupContext } from "@saflib/commander";
import { runLockPrune } from "../src/product-lock-prune.ts";

const program = new Command()
  .name("saf-lock-prune")
  .description(
    "Prune stale product lockfile entries and verify embedded saflib workspace hygiene.",
  )
  .option("--root <dir>", "product monorepo root (default: auto-detect)")
  .option("-y, --yes", "apply fixes without prompting")
  .action(async (options: { root?: string; yes?: boolean }) => {
    const exitCode = await runLockPrune({
      rootDir: options.root,
      yes: options.yes,
    });
    process.exit(exitCode);
  });

setupContext({ serviceName: "saf-lock-prune" }, () => {
  program.parse(process.argv);
});
