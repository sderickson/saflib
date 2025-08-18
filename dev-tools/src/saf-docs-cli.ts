#!/usr/bin/env node --experimental-strip-types --disable-warning=ExperimentalWarning

import { execSync } from "node:child_process";

/**
 * Creates CLI docs for packages.
 */
import { Command } from "commander";

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

program.parse(process.argv);
