import type { Command } from "commander";
import { loadDeployConfig } from "../../src/config.ts";
import { action, buildProductionImages } from "../../src/commands.ts";

export const addStatusCommand = (program: Command) => {
  program
    .command("status")
    .description(
      "Show which production images would be built, pulled from the registry, or are up to date.",
    )
    .option(
      "--platform <platform>",
      "amd64 (default), native, arm64, or os/arch",
      "amd64",
    )
    .action(
      action(async (options: { platform: string }) => {
        await buildProductionImages(loadDeployConfig(), {
          ...options,
          dryRun: true,
        });
      }),
    );
};
