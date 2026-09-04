#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
import { Command } from "commander";
import { setupContext } from "@saflib/commander";
import { add__TargetName__Command } from "./__target-name__.ts";

const program = new Command()
  .name("template-file")
  .description("TODO: Add CLI description");

add__TargetName__Command(program);

setupContext(
  {
    serviceName: "template-file",
  },
  () => {
    program.parse(process.argv);
  },
);
