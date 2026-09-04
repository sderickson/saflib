#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
import { Command } from "commander";
import { setupContext } from "@saflib/commander";
// BEGIN WORKFLOW AREA cli-imports FOR commander/add-command
import { addPrintCommand } from "./print.ts";
import { addGenerateCommand } from "./generate.ts";
import { addGenerateAllCommand } from "./generate-all.ts";
// END WORKFLOW AREA

const program = new Command()
  .name("saf-env")
  .description("Specify, share, and enforce environment variables");

// BEGIN WORKFLOW AREA cli-commands FOR commander/add-command
addPrintCommand(program);
addGenerateCommand(program);
addGenerateAllCommand(program);
// END WORKFLOW AREA

setupContext({ serviceName: "saf-env" }, () => {
  program.parse(process.argv);
});
