import type { Command } from "commander";
import { loadDeployConfig } from "../../src/config.ts";
import { action, publishProductionManifests } from "../../src/commands.ts";

export const addManifestCommand = (program: Command) => {
  program
    .command("manifest")
    .description(
      "Point the production images' latest (and build.json) tags at multi-arch manifest lists of each platform's pushed image. Run after per-platform `push --no-manifest` jobs.",
    )
    .option(
      "--platform <platforms>",
      "comma-separated platforms to combine (default: SAF_DEPLOY_PLATFORMS from env.remote, else amd64)",
    )
    .option("--dry-run", "check every platform's image exists; publish nothing")
    .action(
      action(async (options: { platform?: string; dryRun?: boolean }) => {
        await publishProductionManifests(loadDeployConfig(), options);
      }),
    );
};
