#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
import { Command } from "commander";
import { setupContext } from "@saflib/commander";
// BEGIN WORKFLOW AREA cli-imports FOR commander/add-command
import { addGenerateCommand } from "./generate.ts";
// END WORKFLOW AREA

const program = new Command()
  .name("saf-specs")
  .description("Manage and generate files from OpenAPI specifications");

// BEGIN WORKFLOW AREA cli-commands FOR commander/add-command
addGenerateCommand(program);
// END WORKFLOW AREA

setupContext(
  {
    serviceName: "saf-specs",
  },
  () => {
    program.parse(process.argv);
  },
);
