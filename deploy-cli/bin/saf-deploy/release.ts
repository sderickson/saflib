import type { Command } from "commander";
import { loadDeployConfig } from "../../src/config.ts";
import {
  action,
  buildProductionImages,
  imageOptions,
  type ImageCommandOptions,
} from "../../src/commands.ts";
import { readRemoteScript, runRemote, syncAssets } from "../../src/remote.ts";

export const addReleaseCommand = (program: Command) => {
  imageOptions(
    program
      .command("release")
      .description(
        "Full deploy: push images, sync remote-assets, pull images on the server, and bring the stack up.",
      ),
  ).action(
    action(async (options: ImageCommandOptions) => {
      const config = loadDeployConfig();
      console.log("== push");
      await buildProductionImages(config, { ...options, push: true });
      console.log("\n== sync");
      await syncAssets(config);
      console.log("\n== pull");
      await runRemote(config, readRemoteScript("pull"));
      console.log("\n== up");
      await runRemote(config, readRemoteScript("up"));
    }),
  );
};
