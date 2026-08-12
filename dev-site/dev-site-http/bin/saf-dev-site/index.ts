#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
import { Command } from "commander";
import { setupContext } from "@saflib/commander";

const program = new Command()
  .name("saf-dev-site")
  .description("TODO: Add CLI description");

setupContext(
  {
    serviceName: "saf-dev-site",
  },
  () => {
    program.parse(process.argv);
  },
);
