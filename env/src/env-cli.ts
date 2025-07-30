#!/usr/bin/env node --experimental-strip-types --disable-warning=ExperimentalWarning
import { Command } from "commander";
import { getCombinedEnvSchema } from "./env.ts";

const program = new Command();

program.command("print").action(async () => {
  getCombinedEnvSchema();
});

program.parse(process.argv);
