#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

import { Command } from "commander";
import { setupContext } from "@saflib/commander";
// BEGIN WORKFLOW AREA cli-imports FOR commander/add-command
import { configureLockPruneCommand } from "../saf-monorepo/lock-prune.ts";
// END WORKFLOW AREA

const program = new Command()
  .name("saf-lock-prune")
  .description(
    "Prune stale product lockfile entries and verify embedded saflib workspace hygiene.",
  );

// BEGIN WORKFLOW AREA cli-commands FOR commander/add-command
configureLockPruneCommand(program);
// END WORKFLOW AREA

setupContext({ serviceName: "saf-lock-prune" }, () => {
  program.parse(process.argv);
});
