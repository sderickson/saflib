import type { Command } from "commander";
import path from "node:path";
import { prepareDevStack } from "../../src/prepare.ts";

export const addPrepareCommand = (program: Command) => {
  program
    .command("prepare")
    .description(
      "Write dev-site.env and agent credential files for docker compose (run from <product>/dev).",
    )
    .option(
      "--cwd <path>",
      "Product dev directory (default: process cwd)",
    )
    .action((options: { cwd?: string }) => {
      const devDir = path.resolve(options.cwd ?? process.cwd());
      prepareDevStack(devDir);
    });
};
