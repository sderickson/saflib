#!/usr/bin/env node --experimental-strip-types --disable-warning=ExperimentalWarning
import { Command } from "commander";
import { setupContext } from "@saflib/commander";

const program = new Command()
  .name("hello-world")
  .description("A simple hello world CLI for testing");

setupContext(
  {
    serviceName: "hello-world",
  },
  () => {
    program.parse(process.argv);
  }
);
