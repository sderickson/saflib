#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning

import { Command } from "commander";
import { buildMonorepoContext } from "@saflib/dev-tools";
import { generateCommand } from "./generate.ts";
import { addGenerateAllCommand } from "./generate-all.ts";
import { setupContext } from "@saflib/commander";

const monorepoContext = buildMonorepoContext();

const program = new Command()
  .name("saf-docs")
  .description("Lookup and generation tool for SAF documentation.");

program
  .command("generate")
  .description("Generate typedoc and CLI docs for the current package.")
  .action(() => {
    generateCommand({ monorepoContext });
  });

addGenerateAllCommand(program);

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

setupContext({ serviceName: "saf-docs" }, () => {
  program.parse(process.argv);
});
