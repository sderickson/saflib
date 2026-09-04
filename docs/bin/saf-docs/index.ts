#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

import { Command } from "commander";
import { buildMonorepoContext } from "@saflib/monorepo/workspace";
import { setupContext } from "@saflib/commander";
import { addGenerateCommand } from "./generate.ts";
import { addGenerateAllCommand } from "./generate-all.ts";
import { addCleanupDeclarationsCommand } from "./cleanup-declarations.ts";
import { addPrintCommand } from "./print.ts";

const monorepoContext = buildMonorepoContext();

const program = new Command()
  .name("saf-docs")
  .description("Lookup and generation tool for SAF documentation.");

addGenerateCommand(program, monorepoContext);
addGenerateAllCommand(program);
addCleanupDeclarationsCommand(program, monorepoContext);
addPrintCommand(program, monorepoContext);

setupContext({ serviceName: "saf-docs" }, () => {
  program.parse(process.argv);
});
