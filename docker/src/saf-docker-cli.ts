#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

import { execSync } from "node:child_process";
import { Command } from "commander";
import { generateDockerfiles } from "./docker.ts";
import { buildMonorepoContext } from "@saflib/monorepo/workspace";
import { setupContext } from "@saflib/commander";

const program = new Command()
  .name("saf-docker")
  .description("Helps manage Docker-related files in SAF packages.");

program
  .command("prune")
  .description(
    "Free unused Docker build cache before image builds (avoids ENOSPC during npm ci).",
  )
  .action(() => {
    execSync("docker builder prune -f", { stdio: "inherit" });
  });

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

setupContext({ serviceName: "saf-docker" }, () => {
  program.parse(process.argv);
});
