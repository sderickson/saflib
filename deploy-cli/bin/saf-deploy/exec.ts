import type { Command } from "commander";
import { readFileSync } from "node:fs";
import { loadDeployConfig } from "../../src/config.ts";
import { action } from "../../src/commands.ts";
import { runRemote } from "../../src/remote.ts";

export const addExecCommand = (program: Command) => {
  program
    .command("exec")
    .description(
      "Run a shell script on the server with env.remote's values exported (reads the script from [file] or stdin).",
    )
    .argument("[file]", "script to run (default: stdin)")
    .action(
      action(async (file?: string) => {
        const script = readFileSync(file ?? 0, "utf8");
        await runRemote(loadDeployConfig(), script);
      }),
    );
};
