#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

import { Command } from "commander";
import { setupContext } from "@saflib/commander";
// BEGIN WORKFLOW AREA cli-imports FOR commander/add-command
import { addPruneCommand } from "./prune.ts";
import { addGenerateCommand } from "./generate.ts";
// END WORKFLOW AREA

const program = new Command()
  .name("saf-docker")
  .description("Helps manage Docker-related files in SAF packages.");

// BEGIN WORKFLOW AREA cli-commands FOR commander/add-command
addPruneCommand(program);
addGenerateCommand(program);
// END WORKFLOW AREA

setupContext({ serviceName: "saf-docker" }, () => {
  program.parse(process.argv);
});
