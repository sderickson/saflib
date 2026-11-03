#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
import { Command } from "commander";
import { setupContext } from "@saflib/commander";
// BEGIN WORKFLOW AREA cli-imports FOR commander/add-command
import { add__TargetName__Command } from "./__target-name__.ts";
// END WORKFLOW AREA

const program = new Command()
  .name("template-file")
  .description("TODO: Add CLI description");

// BEGIN WORKFLOW AREA cli-commands FOR commander/add-command
add__TargetName__Command(program);
// END WORKFLOW AREA

setupContext(
  {
    serviceName: "template-file",
  },
  () => {
    program.parse(process.argv);
  },
);
