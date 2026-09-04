#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
import { Command } from "commander";
import { setupContext } from "@saflib/commander";
// BEGIN WORKFLOW AREA cli-imports FOR commander/add-command
import { addFormatCommand } from "./format.ts";
import { addLockPruneCommand } from "./lock-prune.ts";
// END WORKFLOW AREA

const program = new Command()
  .name("saf-monorepo")
  .description("npm workspace package conventions and validation for SAF monorepos");

// BEGIN WORKFLOW AREA cli-commands FOR commander/add-command
addFormatCommand(program);
addLockPruneCommand(program);
// END WORKFLOW AREA

setupContext({ serviceName: "saf-monorepo" }, () => {
  program.parse(process.argv);
});
