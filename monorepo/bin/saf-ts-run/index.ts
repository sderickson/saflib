#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

/**
 * Run a TypeScript file with the monorepo-standard Node flags and optional `.env`.
 *
 * Usage: saf-ts-run <script.ts> [args...]
 *
 * Loads `.env` from the current working directory when present (same as
 * `node --env-file=.env`). Always enables `--experimental-strip-types`.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { Command } from "commander";
import { setupContext } from "@saflib/commander";
// BEGIN WORKFLOW AREA cli-imports FOR commander/add-command
// END WORKFLOW AREA

const program = new Command()
  .name("saf-ts-run")
  .description(
    "Run a TypeScript file with monorepo-standard Node flags and optional .env",
  )
  .argument("<script>", "TypeScript entry file")
  .allowExcessArguments()
  .action((script: string) => {
    const scriptIndex = process.argv.indexOf(script);
    const scriptArgs = process.argv.slice(scriptIndex + 1);
    const nodeArgs = [
      ...(existsSync(".env") ? ["--env-file=.env"] : []),
      "--experimental-strip-types",
      "--disable-warning=ExperimentalWarning",
      script,
      ...scriptArgs,
    ];

    const result = spawnSync(process.execPath, nodeArgs, { stdio: "inherit" });
    process.exit(result.status ?? 1);
  });

// BEGIN WORKFLOW AREA cli-commands FOR commander/add-command
// END WORKFLOW AREA

setupContext({ serviceName: "saf-ts-run" }, () => {
  program.parse(process.argv);
});
