#!/usr/bin/env node --experimental-strip-types --disable-warning=ExperimentalWarning

import { Command } from "commander";
import { generateDockerfiles } from "./docker.ts";
import { buildMonorepoContext } from "./workspace.ts";

const program = new Command()
  .name("saf-docker")
  .description("Helps manage Docker-related files in SAF packages.");

program
  .command("generate")
  .description("Generate all Dockerfiles from templates across the monorepo.")
  .action(() => {
    const monorepoContext = buildMonorepoContext();
    generateDockerfiles(monorepoContext, true);
  });

program.parse(process.argv);
