#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
import { Command } from "commander";
import { setupContext } from "@saflib/commander";
import { addExportsCommand } from "./exports.ts";
import { addSideEffectsCommand } from "./side-effects.ts";
import { addLockPruneCommand } from "./lock-prune.ts";

const program = new Command()
  .name("saf-monorepo")
  .description("npm workspace package conventions and validation for SAF monorepos");

addExportsCommand(program);
addSideEffectsCommand(program);
addLockPruneCommand(program);

setupContext({ serviceName: "saf-monorepo" }, () => {
  program.parse(process.argv);
});
