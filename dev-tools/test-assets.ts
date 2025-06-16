#!/usr/bin/env node --experimental-strip-types

import { Command } from "commander";

const program = new Command()
  .name("saf-test-assets")
  .description("Manage test assets from the e2e and unit tests.");

program
  .command("gather")
  .description("Gather test assets from the e2e and unit tests.")
  .argument("<paths>", "Directories with nested test assets, comma separated")
  .action(async (paths) => {
    console.log("running with paths", paths);
  });

program.parse(process.argv);
