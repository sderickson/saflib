import type { Command } from "commander";
import { generateDockerfiles } from "../../src/docker.ts";
import { buildMonorepoContext } from "@saflib/monorepo/workspace";

export const addGenerateCommand = (program: Command) => {
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
};
