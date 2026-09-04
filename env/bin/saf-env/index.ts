#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
import { Command } from "commander";
import { setupContext } from "@saflib/commander";
import { addPrintCommand } from "./print.ts";
import { addGenerateCommand } from "./generate.ts";
import { addGenerateAllCommand } from "./generate-all.ts";

const program = new Command()
  .name("saf-env")
  .description("Specify, share, and enforce environment variables");

addPrintCommand(program);
addGenerateCommand(program);
addGenerateAllCommand(program);

setupContext({ serviceName: "saf-env" }, () => {
  program.parse(process.argv);
});
