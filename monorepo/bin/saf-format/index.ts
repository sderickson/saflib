#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

import { execSync } from "child_process";
import { Command } from "commander";
import { setupContext } from "@saflib/commander";
// BEGIN WORKFLOW AREA cli-imports FOR commander/add-command
// END WORKFLOW AREA

const program = new Command()
  .name("saf-format")
  .description("Format a file with Prettier")
  .argument("<filename>", "File to format with Prettier")
  .action((fileName: string) => {
    if (fileName === "help") {
      program.outputHelp();
      return;
    }
    try {
      execSync(`prettier --write ${fileName}`);
    } catch (error) {
      console.error(`Error formatting ${fileName}:`, error);
      process.exit(1);
    }
  });

// BEGIN WORKFLOW AREA cli-commands FOR commander/add-command
// END WORKFLOW AREA

setupContext({ serviceName: "saf-format" }, () => {
  program.parse(process.argv);
});
