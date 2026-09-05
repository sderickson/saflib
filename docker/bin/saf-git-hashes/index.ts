#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

import { Command } from "commander";
import { setupContext } from "@saflib/commander";
// BEGIN WORKFLOW AREA cli-imports FOR commander/add-command
import { writeGitHashesEnvFile } from "../../src/git-hashes.ts";
// END WORKFLOW AREA

const program = new Command()
  .name("saf-git-hashes")
  .description("Generate git hash files for builds to access in node and vue.")
  .action(() => {
    const { root, saflib } = writeGitHashesEnvFile({
      cwd: process.cwd(),
    });
    console.log(`Wrote hashes (root=${root} saflib=${saflib})`);
  });

// BEGIN WORKFLOW AREA cli-commands FOR commander/add-command
// END WORKFLOW AREA

setupContext({ serviceName: "saf-git-hashes" }, () => {
  program.parse(process.argv);
});
