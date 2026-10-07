#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

import { Command } from "commander";
import { setupContext } from "@saflib/commander";
// BEGIN WORKFLOW AREA cli-imports FOR commander/add-command
import { writeGitHashesEnvFile } from "../../src/git-hashes.ts";
// END WORKFLOW AREA

const program = new Command()
  .name("saf-git-hashes")
  .description(
    "Deprecated: `saf-docker build` records commits in each image (/etc/saf/build.json). Still writes git-hashes.json for products whose scripts haven't migrated.",
  )
  .action(() => {
    console.warn(
      "saf-git-hashes is deprecated: build images with `saf-docker build`, which records build info in /etc/saf/build.json (see @saflib/docker docs).",
    );
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
