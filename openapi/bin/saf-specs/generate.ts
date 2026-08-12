import type { Command } from "commander";
import { addNewLinesToString } from "@saflib/utils";
import { execFileSync } from "child_process";
import { getSafReporters } from "@saflib/node";
import { errorSchema } from "@saflib/openapi/error";
import { mkdirSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { resolvePackageBin } from "./resolve-bin.ts";

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
      const { log } = getSafReporters();

      const { file, output } = options;
      const outputDir = path.resolve(process.cwd(), output);

      rmSync(outputDir, { recursive: true, force: true });
      mkdirSync(outputDir, { recursive: true });

      mkdirSync(path.join(process.cwd(), "./schemas"), { recursive: true });

      writeFileSync(
        path.join(process.cwd(), "./schemas/error.yaml"),
        errorSchema,
      );

      const openapiTypescriptBin = resolvePackageBin("openapi-typescript");
      const redoclyBin = resolvePackageBin("@redocly/cli", "redocly");

      log.info("Generating OpenAPI types...");
      execFileSync(
        openapiTypescriptBin,
        [file, "-o", `${output}/openapi.d.ts`],
        { stdio: "inherit" },
      );

      log.info("Generating JSON bundle...");
      execFileSync(
        redoclyBin,
        ["bundle", file, "--ext", "json", "--output", `${output}/openapi.json`],
        { stdio: "inherit" },
      );

      if (options.html) {
        log.info("Generating HTML documentation...");
        execFileSync(
          redoclyBin,
          ["build-docs", file, `--output=${output}/index.html`],
          { stdio: "inherit" },
        );
      }

      log.info("Generating per-operation and schema fragments...");
      const {
        generateOperationFragments,
        generateSchemaFragments,
      } = await import("./generate-fragments.ts");
      await generateOperationFragments(outputDir);
      generateSchemaFragments(outputDir);

      log.info("✅ OpenAPI generation completed successfully!");
    });
};
