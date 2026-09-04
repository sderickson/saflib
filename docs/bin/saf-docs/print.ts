import type { Command } from "commander";
import type { MonorepoContext } from "@saflib/monorepo/workspace";

export const addPrintCommand = (
  program: Command,
  monorepoContext: MonorepoContext,
) => {
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
};
