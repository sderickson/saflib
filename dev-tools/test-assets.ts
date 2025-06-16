#!/usr/bin/env node --experimental-strip-types

import { Command } from "commander";
import { gatherTestAssets } from "./src/test-assets.ts";

const program = new Command()
  .name("saf-test-assets")
  .description("Manage test assets from the e2e and unit tests.");

program
  .command("gather")
  .description("Gather test assets from the e2e and unit tests.")
  .action(async () => {
    gatherTestAssets();
  });

program.parse(process.argv);
