#!/usr/bin/env node --experimental-strip-types --disable-warning=ExperimentalWarning

import { execSync } from "node:child_process";

import { Command } from "commander";
import { buildMonorepoContext, getCurrentPackageName } from "./workspace.ts";
import { mkdirSync, writeFileSync } from "node:fs";
const monorepoContext = buildMonorepoContext();

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

    console.log("Generating CLI docs...");
    const currentPackage = getCurrentPackageName();
    const currentPackageJson =
      monorepoContext.monorepoPackageJsons[currentPackage];
    const bin = currentPackageJson.bin;
    if (bin && Object.keys(bin).length > 0) {
      mkdirSync("docs/cli", { recursive: true });
      for (const command of Object.keys(bin)) {
        const result = execSync(`npm exec ${command} --help`);
        const wrappedResult = `# ${command}\n\n\`\`\`\n${result.toString()}\n\`\`\`\n`;
        writeFileSync(`docs/cli/${command}.md`, wrappedResult);
      }
      const indexMd = `# CLI Reference\n\nThis package provides commands in its package.json bin field. These are listed below:\n\n${Object.keys(
        bin,
      )
        .map((command) => `- [${command}](./${command}.md)`)
        .join("\n")}`;
      writeFileSync("docs/cli/index.md", indexMd);
    }
  });

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
