import type { Command } from "commander";
import { addNewLinesToString } from "@saflib/utils";
import { execSync } from "child_process";
import { getSafReporters } from "@saflib/node";

export const addGenerateCommand = (program: Command) => {
  program
    .command("generate")
    .description(
      addNewLinesToString(
        "Generate OpenAPI types, JSON bundle, and HTML documentation",
      ),
    )
    .option("-f, --file <file>", "OpenAPI spec file path", "./openapi.yaml")
    .option("-o, --output <dir>", "Output directory", "./dist")
    .option("-h, --html", "Also generate HTML documentation")
    .action(async (options) => {
      const { log, logError } = getSafReporters();

      try {
        const { file, output } = options;

        log.info("Generating OpenAPI types...");
        execSync(`openapi-typescript ${file} -o ${output}/openapi.d.ts`, {
          stdio: "inherit",
        });

        log.info("Generating JSON bundle...");
        execSync(
          `redocly bundle ${file} --ext json --output ${output}/openapi.json`,
          { stdio: "inherit" },
        );

        if (options.html) {
          log.info("Generating HTML documentation...");
          execSync(`redocly build-docs ${file} --output=${output}/index.html`, {
            stdio: "inherit",
          });
        }

        log.info("✅ OpenAPI generation completed successfully!");
      } catch (err) {
        logError(err);
        process.exit(1);
      }
    });
};
