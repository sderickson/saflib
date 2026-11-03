import type { Command } from "commander";
import { loadDeployConfig } from "../../src/config.ts";
import { action } from "../../src/commands.ts";
import { runRemote, upScript } from "../../src/remote.ts";

export const addUpCommand = (program: Command) => {
  program
    .command("up")
    .description(
      "Start or update the production stack on the server (docker compose up -d --force-recreate), then register its edge routes.",
    )
    .action(
      action(async () => {
        await runRemote(loadDeployConfig(), upScript());
      }),
    );
};
