#!/usr/bin/env node --experimental-strip-types --disable-warning=ExperimentalWarning
import { Command } from "commander";
import { buildMonorepoContext, type MonorepoContext } from "./workspace.ts";
import { assert } from "node:console";

async function main() {
  const program = new Command()
    .name("saf-doc")
    .description(
      "CLI tool to explore and document the monorepo structure and packages.",
    )
    .action(() => {
      // print help if no arguments are provided
      if (process.argv.length <= 2) {
        program.outputHelp();
      }
    });

  let monorepoContext: MonorepoContext | undefined;
  monorepoContext = buildMonorepoContext(process.cwd());
  assert(monorepoContext, "Failed to build monorepo context");

  for (const packageName of monorepoContext.packages) {
    const packageJson = monorepoContext.monorepoPackageJsons[packageName];

    program
      .command(packageName)
      .description(packageJson.description || "<Missing description>")
      .action(() => {
        const targetPackageJson =
          monorepoContext.monorepoPackageJsons[packageName];
        assert(targetPackageJson, `Package ${packageName} not found.`);
        console.log(JSON.stringify(targetPackageJson, null, 2));
      });
  }

  program.parse(process.argv);
}

main().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
