#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

import { Command } from "commander";
import { setupContext } from "@saflib/commander";
import { writeGitHashesEnvFile } from "./git-hashes.ts";

const program = new Command()
  .name("saf-git-hashes")
  .description("Generate a .env.git-hashes file with git hashes for dev builds.");

program
  .option(
    "-o, --output <file>",
    "Output env file path (written relative to current working directory).",
    ".env.git-hashes",
  )
  .action((options: { output: string }) => {
    const { filePath, root, saflib } = writeGitHashesEnvFile({
      outputFile: options.output,
      cwd: process.cwd(),
    });
    console.log(
      `Wrote ${filePath} (root=${root} saflib=${saflib})`,
    );
  });

setupContext({ serviceName: "saf-git-hashes" }, () => {
  program.parse(process.argv);
});

