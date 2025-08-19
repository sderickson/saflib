#!/usr/bin/env node --experimental-strip-types --disable-warning=ExperimentalWarning

import { execSync } from "node:child_process";

import { Command } from "commander";
import { buildMonorepoContext, getCurrentPackageName } from "./workspace.ts";
import { mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
const monorepoContext = buildMonorepoContext();

const program = new Command()
  .name("saf-docs")
  .description("Lookup and generation tool for SAF documentation.");

program
  .command("generate")
  .description("Generate typedoc and CLI docs for the current package.")
  .action(() => {
    const currentPackage = getCurrentPackageName();
    const currentPackageJson =
      monorepoContext.monorepoPackageJsons[currentPackage];

    const entrypoints = currentPackageJson.exports;
    if (!entrypoints) {
      throw new Error(
        "No exports found in package.json; use `exports` field not `main`.",
      );
    }
    const entrypointCommands = Object.values(entrypoints)
      .filter((entrypoint) => !entrypoint.includes("./workflows"))
      .map((entrypoint) => {
        return `--entryPoints ${entrypoint}`;
      });

    console.log("\nGenerating typedoc...");
    const command = [
      "typedoc",

      // for each entrypoint, add the entrypoint command
      ...entrypointCommands,

      // for easy reading on GitHub, Vitepress
      "--plugin typedoc-plugin-markdown",

      // Default is README.md, but these docs are not the entrypoint
      "--entryFileName index",

      // nest the output in docs so as not to trample other docs
      "--out docs/ref",

      // easier reading
      "--indexFormat table",
      "--parametersFormat table",

      // Breadcrumbs are broken? The links have nothing in the square brackets
      "--hideBreadcrumbs",

      // It's nice that typedoc identifies forgotten exports. Use it to enforce!
      // "--treatValidationWarningsAsErrors",

      // Since I'm committing these to the repo, sources will create a bunch of
      // noise with their GitHub-links-with-shas.
      "--disableSources",
    ].join(" ");

    try {
      execSync(command, { stdio: "inherit" });
    } catch (e) {
      console.error("Failed to generate docs. Fix warnings above.");
      process.exit(1);
    }

    console.log("\nGenerating CLI docs...");
    const bin = currentPackageJson.bin;
    if (bin && Object.keys(bin).length > 0) {
      mkdirSync("docs/cli", { recursive: true });
      for (const file of readdirSync("docs/cli")) {
        unlinkSync(`docs/cli/${file}`);
      }

      const sortedCommands = Object.keys(bin).sort();

      for (const command of sortedCommands) {
        const result = execSync(`npm exec ${command} help`);
        const wrappedResult = `# ${command}\n\n\`\`\`\n${result.toString()}\n\`\`\`\n`;
        writeFileSync(`docs/cli/${command}.md`, wrappedResult);
        console.log(`- ${command}`);
      }

      const indexMd = `# CLI Reference\n\nThis package provides commands in its package.json bin field. These are listed below:\n\n${sortedCommands
        .map((command) => `- [${command}](./${command}.md)`)
        .join("\n")}`;
      writeFileSync("docs/cli/index.md", indexMd);
      console.log("Finished generating CLI docs at ./docs/cli");
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
