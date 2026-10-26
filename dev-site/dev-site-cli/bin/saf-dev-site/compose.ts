import { spawnSync } from "node:child_process";
import type { Command } from "commander";
import path from "node:path";
import {
  dockerComposeArgv,
  resolveComposeInvocation,
  type ComposeStackKind,
} from "../../src/compose-config.ts";
import { prepareDevStack } from "../../src/prepare.ts";

function composeUserArgs(): string[] {
  const argv = process.argv;
  const start = argv.indexOf("compose") + 1;
  const out: string[] = [];
  for (let i = start; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--cwd") {
      i++;
      continue;
    }
    if (arg === "--dev-site" || arg === "--no-prepare") {
      continue;
    }
    if (arg.startsWith("--cwd=")) {
      continue;
    }
    out.push(arg);
  }
  return out;
}

export const addComposeCommand = (program: Command) => {
  program
    .command("compose")
    .description(
      "Run docker compose for the dev stack (prepares env files first unless --no-prepare).",
    )
    .option("--cwd <path>", "Product dev directory (default: process cwd)")
    .option(
      "--dev-site",
      "Use docker-compose.dev-site.yaml instead of the full stack",
    )
    .option("--no-prepare", "Skip saf-dev-site prepare before compose")
    .allowUnknownOption()
    .allowExcessArguments(true)
    .action((options: { cwd?: string; devSite?: boolean; noPrepare?: boolean }) => {
      const devDir = path.resolve(options.cwd ?? process.cwd());
      if (!options.noPrepare) {
        prepareDevStack(devDir);
      }
      const kind: ComposeStackKind = options.devSite ? "dev-site" : "stack";
      const invocation = resolveComposeInvocation(devDir, kind);
      const composeArgs = dockerComposeArgv(invocation);
      const userArgs = composeUserArgs();

      const result = spawnSync(
        "docker",
        ["compose", ...composeArgs, ...userArgs],
        { cwd: invocation.cwd, stdio: "inherit" },
      );
      if (result.status !== 0) {
        process.exit(result.status ?? 1);
      }
    });
};
