import type { Command } from "commander";
import { loadDeployConfig } from "../../src/config.ts";
import { action } from "../../src/commands.ts";
import { rollbackScript, runLocal, runRemote } from "../../src/remote.ts";

export const addRollbackCommand = (program: Command) => {
  program
    .command("rollback")
    .description(
      "Run the blue-green services' previous images again (recorded by the last successful `up`), with the same health gate as a deploy. The rest of the stack is left alone.",
    )
    .option(
      "--local",
      "Roll back on the local Docker (beside prod-local) instead of the server",
    )
    .action(
      action(async (options: { local?: boolean }) => {
        const config = loadDeployConfig();
        await (options.local
          ? runLocal(config, rollbackScript())
          : runRemote(config, rollbackScript()));
      }),
    );
};
