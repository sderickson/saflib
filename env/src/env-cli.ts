#!/usr/bin/env node --experimental-strip-types --disable-warning=ExperimentalWarning
import { Command } from "commander";

const program = new Command();

program.command("print").action(async () => {
  console.log("print");
});

program.parse(process.argv);
