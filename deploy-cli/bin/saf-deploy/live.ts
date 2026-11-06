import type { Command } from "commander";
import { loadDeployConfig } from "../../src/config.ts";
import { action } from "../../src/commands.ts";
import { readRemoteScript, runLocal, runRemote } from "../../src/remote.ts";

export const addLiveCommand = (program: Command) => {
  program
    .command("live")
    .description(
      "Show which blue-green color is live and the state of each color's containers.",
    )
    .option(
      "--local",
      "Check the local Docker (prod-local) instead of the server",
    )
    .action(
      action(async (options: { local?: boolean }) => {
        const config = loadDeployConfig();
        const script = readRemoteScript("live");
        await (options.local
          ? runLocal(config, script)
          : runRemote(config, script));
      }),
    );
};
