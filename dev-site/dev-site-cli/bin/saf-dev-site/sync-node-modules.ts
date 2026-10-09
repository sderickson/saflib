import { execFileSync } from "node:child_process";
import type { Command } from "commander";
import path from "node:path";
import {
  dockerComposeArgv,
  resolveComposeInvocation,
  type ComposeStackKind,
} from "../../src/compose-config.ts";
import { prepareDevStack } from "../../src/prepare.ts";

export const addSyncNodeModulesCommand = (program: Command) => {
  program
    .command("sync-node-modules")
    .description(
      "Refresh named node_modules volumes when saf-docker install stages change (wraps saf-docker sync-node-modules).",
    )
    .option("--cwd <path>", "Product dev directory (default: process cwd)")
    .option("--dev-site", "Use docker-compose.dev-site.yaml")
    .option("--no-prepare", "Skip saf-dev-site prepare first")
    .action((options: { cwd?: string; devSite?: boolean; noPrepare?: boolean }) => {
      const devDir = path.resolve(options.cwd ?? process.cwd());
      if (!options.noPrepare) {
        prepareDevStack(devDir);
      }
      const kind: ComposeStackKind = options.devSite ? "dev-site" : "stack";
      const invocation = resolveComposeInvocation(devDir, kind);
      const args = ["sync-node-modules", ...dockerComposeArgv(invocation)];
      execFileSync("saf-docker", args, {
        cwd: invocation.cwd,
        stdio: "inherit",
      });
    });
};
