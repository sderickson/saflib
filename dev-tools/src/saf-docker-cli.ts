#!/usr/bin/env node --experimental-strip-types --disable-warning=ExperimentalWarning

import { Command } from "commander";
import { generateDockerfiles } from "./docker.ts";
import { buildMonorepoContext } from "./workspace.ts";
import { setupContext } from "@saflib/commander";

const program = new Command()
  .name("saf-docker")
  .description("Helps manage Docker-related files in SAF packages.");

program
  .command("generate")
  .description("Generate all Dockerfiles from templates across the monorepo.")
  .action(() => {
    console.log("Generating context...");
    const monorepoContext = buildMonorepoContext();
    console.log("Generating Dockerfiles...");
    generateDockerfiles(monorepoContext, true);
    console.log("Done.");
  });

console.log("Parsing...");
setupContext({ serviceName: "saf-docker" }, () => {
  program.parse(process.argv);
});
console.log("Done done.");
