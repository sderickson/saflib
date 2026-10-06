import type { Command } from "commander";
import { loadDeployConfig } from "../../src/config.ts";
import { action } from "../../src/commands.ts";
import { syncAssets } from "../../src/remote.ts";

export const addSyncCommand = (program: Command) => {
  program
    .command("sync")
    .description(
      "Upload remote-assets/ (compose file, config) to REMOTE_ASSETS_FOLDER_PATH on the server.",
    )
    .action(
      action(async () => {
        await syncAssets(loadDeployConfig());
      }),
    );
};
