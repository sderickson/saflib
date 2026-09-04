#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
import { Command } from "commander";
import { setupContext } from "@saflib/commander";
// BEGIN WORKFLOW AREA cli-imports FOR commander/add-command
import { addExportsCommand } from "./exports.ts";
import { addFormatCommand } from "./format.ts";
import { addLockPruneCommand } from "./lock-prune.ts";
import { addSideEffectsCommand } from "./side-effects.ts";
// END WORKFLOW AREA

const program = new Command()
  .name("saf-monorepo")
  .description("npm workspace package conventions and validation for SAF monorepos");

// BEGIN WORKFLOW AREA cli-commands FOR commander/add-command
addExportsCommand(program);
addFormatCommand(program);
addLockPruneCommand(program);
addSideEffectsCommand(program);
// END WORKFLOW AREA

setupContext({ serviceName: "saf-monorepo" }, () => {
  program.parse(process.argv);
});
