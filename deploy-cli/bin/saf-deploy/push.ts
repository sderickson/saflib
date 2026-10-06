import type { Command } from "commander";
import { loadDeployConfig } from "../../src/config.ts";
import {
  action,
  buildProductionImages,
  imageOptions,
  type ImageCommandOptions,
} from "../../src/commands.ts";

export const addPushCommand = (program: Command) => {
  imageOptions(
    program
      .command("push")
      .description(
        "Build (if needed) and push the production images to CONTAINER_REGISTRY; images already pushed are only retagged.",
      ),
  ).action(
    action(async (options: ImageCommandOptions) => {
      await buildProductionImages(loadDeployConfig(), {
        ...options,
        push: true,
      });
    }),
  );
};
