#!/usr/bin/env node --experimental-strip-types --disable-warning=ExperimentalWarning

import { execSync } from "node:child_process";

import { Command } from "commander";
import { buildMonorepoContext } from "./workspace.ts";

const program = new Command()
  .name("saf-docs")
  .description("Utility for SAF documentation.");

program
  .command("generate")
  .description("Generate CLI docs for packages.")
  .action(() => {
    console.log("Generating typedoc...");
    const command =
      "typedoc --plugin typedoc-plugin-markdown --entryFileName index --out docs/ref  --indexFormat htmlTable --hideBreadcrumbs --parametersFormat htmlTable --treatValidationWarningsAsErrors";

    try {
      execSync(command, { stdio: "inherit" });
    } catch (e) {
      console.error("Failed to generate docs. Fix warnings above.");
      process.exit(1);
    }

    // console.log("Generating CLI docs...");
  });

const monorepoContext = buildMonorepoContext();

const packagesSorted = Array.from(monorepoContext.packages).sort();

const printProgram = program
  .command("print")
  .description("List all packages in the monorepo.")
  .action(() => {
    printProgram.outputHelp();
  });

packagesSorted.forEach((packageName) => {
  printProgram
    .command(packageName)
    .description(
      monorepoContext.monorepoPackageJsons[packageName].description ||
        "<Missing description>",
    )
    .action(() => {
      console.log(
        JSON.stringify(
          monorepoContext.monorepoPackageJsons[packageName],
          null,
          2,
        ),
      );
    });
});

program.parse(process.argv);
