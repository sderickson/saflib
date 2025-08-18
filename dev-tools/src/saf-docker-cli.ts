#!/usr/bin/env node --experimental-strip-types --disable-warning=ExperimentalWarning

import { Command } from "commander";
import { generateDockerfiles } from "./docker.ts";
import { buildMonorepoContext } from "./workspace.ts";

const program = new Command()
  .name("saf-docker")
  .description("Manage Dockerfiles for packages.");

program
  .command("generate")
  .description("Generate Dockerfiles for packages.")
  .action(() => {
    const monorepoContext = buildMonorepoContext();
    generateDockerfiles(monorepoContext, true);
  });

program.parse(process.argv);
