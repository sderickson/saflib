#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

import { Command } from "commander";
import { setupContext } from "@saflib/commander";
import { configureLockPruneCommand } from "../saf-monorepo/lock-prune.ts";

const program = new Command()
  .name("saf-lock-prune")
  .description(
    "Prune stale product lockfile entries and verify embedded saflib workspace hygiene.",
  );

configureLockPruneCommand(program);

setupContext({ serviceName: "saf-lock-prune" }, () => {
  program.parse(process.argv);
});
