#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

import { Command } from "commander";
import { setupContext } from "@saflib/commander";
import { addPruneCommand } from "./prune.ts";
import { addGenerateCommand } from "./generate.ts";

const program = new Command()
  .name("saf-docker")
  .description("Helps manage Docker-related files in SAF packages.");

addPruneCommand(program);
addGenerateCommand(program);

setupContext({ serviceName: "saf-docker" }, () => {
  program.parse(process.argv);
});
