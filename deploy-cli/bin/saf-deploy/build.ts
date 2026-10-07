import type { Command } from "commander";
import { loadDeployConfig } from "../../src/config.ts";
import {
  action,
  buildProductionImages,
  imageOptions,
  type ImageCommandOptions,
} from "../../src/commands.ts";

export const addBuildCommand = (program: Command) => {
  imageOptions(
    program
      .command("build")
      .description(
        "Build the images remote-assets/docker-compose.prod.yaml runs (and their upstream builds), skipping unchanged ones and reusing registry copies.",
      ),
  ).action(
    action(async (options: ImageCommandOptions) => {
      await buildProductionImages(loadDeployConfig(), options);
    }),
  );
};
