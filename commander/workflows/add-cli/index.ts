#!/usr/bin/env node --experimental-strip-types --disable-warning=ExperimentalWarning
import { Command } from "commander";
import { setupContext } from "@saflib/commander";

const program = new Command()
  .name("template-file")
  .description("TODO: Add CLI description");

setupContext(
  {
    serviceName: "template-file",
  },
  () => {
    program.parse(process.argv);
  },
);
