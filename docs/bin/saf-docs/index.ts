#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

import { Command } from "commander";
import { buildMonorepoContext } from "@saflib/monorepo/workspace";
import { setupContext } from "@saflib/commander";
// BEGIN WORKFLOW AREA cli-imports FOR commander/add-command
import { addGenerateCommand } from "./generate.ts";
import { addGenerateAllCommand } from "./generate-all.ts";
import { addCleanupDeclarationsCommand } from "./cleanup-declarations.ts";
import { addPrintCommand } from "./print.ts";
// END WORKFLOW AREA

const monorepoContext = buildMonorepoContext();

const program = new Command()
  .name("saf-docs")
  .description("Lookup and generation tool for SAF documentation.");

// BEGIN WORKFLOW AREA cli-commands FOR commander/add-command
addGenerateCommand(program, monorepoContext);
addGenerateAllCommand(program);
addCleanupDeclarationsCommand(program, monorepoContext);
addPrintCommand(program, monorepoContext);
// END WORKFLOW AREA

setupContext({ serviceName: "saf-docs" }, () => {
  program.parse(process.argv);
});
