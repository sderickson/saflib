import { execSync } from "node:child_process";
import type { Command } from "commander";

export const addPruneCommand = (program: Command) => {
  program
    .command("prune")
    .description(
      "Free unused Docker build cache before image builds (avoids ENOSPC during npm ci).",
    )
    .action(() => {
      execSync("docker builder prune -f", { stdio: "inherit" });
    });
};
