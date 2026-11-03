import type { Command } from "commander";
import { loadDeployConfig } from "../../src/config.ts";
import { action } from "../../src/commands.ts";
import { runLocal, runRemote, upScript } from "../../src/remote.ts";

export const addUpCommand = (program: Command) => {
  program
    .command("up")
    .description(
      "Start or update the production stack on the server (docker compose up -d --force-recreate), then register its edge routes. Services in remote-assets/docker-compose.blue-green.yaml deploy blue-green: the new color must turn healthy before routes switch to it, and stay healthy or routes switch back.",
    )
    .option(
      "--local",
      "Run the blue-green deploy and route registration against the local Docker, beside a running prod-local stack (the rest of the stack is left to prod-local)",
    )
    .action(
      action(async (options: { local?: boolean }) => {
        const config = loadDeployConfig();
        await (options.local
          ? runLocal(config, upScript())
          : runRemote(config, upScript()));
      }),
    );
};
