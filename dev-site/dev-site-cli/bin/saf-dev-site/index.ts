#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

import { Command } from "commander";
import { setupContext } from "@saflib/commander";
import { addPrepareCommand } from "./prepare.ts";
import { addComposeCommand } from "./compose.ts";
import { addSyncNodeModulesCommand } from "./sync-node-modules.ts";

const program = new Command()
  .name("saf-dev-site")
  .description(
    "Prepare and run local dev-site docker compose stacks. Run from a product dev/ directory (e.g. my-product/dev).",
  );

addPrepareCommand(program);
addSyncNodeModulesCommand(program);
addComposeCommand(program);

setupContext({ serviceName: "saf-dev-site" }, () => {
  program.parseAsync(process.argv).catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
});
