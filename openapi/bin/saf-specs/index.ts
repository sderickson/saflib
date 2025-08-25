#!/usr/bin/env node --experimental-strip-types --disable-warning=ExperimentalWarning
import { Command } from "commander";
import { setupContext } from "@saflib/commander";
import { addGenerateCommand } from "./generate.ts";

const program = new Command()
  .name("saf-specs")
  .description("Manage and generate files from OpenAPI specifications");

addGenerateCommand(program);

setupContext(
  {
    serviceName: "saf-specs",
  },
  () => {
    program.parse(process.argv);
  },
);
