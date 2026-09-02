#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

import { Command } from "commander";
import { setupContext } from "@saflib/commander";
import { writeGitHashesEnvFile } from "./git-hashes.ts";

const program = new Command()
  .name("saf-git-hashes")
  .description("Generate git hash files for builds to access in node and vue.");

program.action(() => {
  const { root, saflib } = writeGitHashesEnvFile({
    cwd: process.cwd(),
  });
  console.log(`Wrote hashes (root=${root} saflib=${saflib})`);
});

setupContext({ serviceName: "saf-git-hashes" }, () => {
  program.parse(process.argv);
});
