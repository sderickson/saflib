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
      "--platform <platforms>",
      "amd64, arm64, native, os/arch, or a comma-separated list (default: SAF_DEPLOY_PLATFORMS from env.remote, else amd64)",
    )
    .action(
      action(async (options: { platform?: string }) => {
        await buildProductionImages(loadDeployConfig(), {
          ...options,
          dryRun: true,
        });
      }),
    );
};
