#!/usr/bin/env node --experimental-strip-types --disable-warning=ExperimentalWarning
import { Command } from "commander";
import { setupContext } from "@saflib/commander";

const program = new Command()
  .name("saf-specs")
  .description("TODO: Add CLI description")
  .action(() => {
    program.help();
  });

setupContext(
  {
    serviceName: "saf-specs",
  },
  () => {
    program.parse(process.argv);
  },
);
