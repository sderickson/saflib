import type { Command } from "commander";
import { addNewLinesToString } from "@saflib/utils";
import { execFileSync } from "child_process";
import { getSafReporters } from "@saflib/node";
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs";
import path from "path";
import { resolvePackageBin } from "./resolve-bin.ts";
import { rewritePkgRefs } from "./resolve-pkg-refs.ts";
import { bundleOpenApiToJson } from "./bundle-openapi.ts";
import { rewriteExternalSchemaTypes } from "./rewrite-external-types.ts";

/**
 * Clear codegen outputs under `-o` while preserving `types/` (composite `tsc -b`
 * declaration emit). A full `rmSync(dist)` leaves `vue-tsc -b` with stale
 * tsbuildinfo and missing `.d.ts` → TS6305 until a forced rebuild.
 */
function clearGeneratedOutput(outputDir: string): void {
  mkdirSync(outputDir, { recursive: true });
  for (const entry of readdirSync(outputDir)) {
    if (entry === "types") continue;
    rmSync(path.join(outputDir, entry), { recursive: true, force: true });
  }
}

export const addGenerateCommand = (program: Command) => {
  program
    .command("generate")
    .description(
      addNewLinesToString(
        "Generate OpenAPI types, JSON bundle, and per-operation/schema fragments",
      ),
    )
    .option("-f, --file <file>", "OpenAPI spec file path", "./openapi.yaml")
    .option("-o, --output <dir>", "Output directory", "./dist")
    .option(
      "-h, --html",
      "Deprecated: HTML docs are served by @saflib/dev-site (ignored)",
    )
    .action(async (options) => {
      const { log } = getSafReporters();

      const { file, output } = options;
      const cwd = process.cwd();
      const outputDir = path.resolve(cwd, output);

      clearGeneratedOutput(outputDir);

      if (options.html) {
        log.warn(
          "--html is deprecated; use @saflib/dev-site for API docs instead of Redocly HTML.",
        );
      }

      log.info("Resolving pkg: $refs...");
      const resolved = rewritePkgRefs({ entryFile: file, cwd });
      try {
        const openapiTypescriptBin = resolvePackageBin("openapi-typescript");
        const dtsPath = path.join(outputDir, "openapi.d.ts");
        const jsonPath = path.join(outputDir, "openapi.json");

        log.info("Generating OpenAPI types...");
        execFileSync(
          openapiTypescriptBin,
          [resolved.rewrittenEntryPath, "-o", dtsPath],
          { stdio: "inherit" },
        );

        if (resolved.externalSchemas.size > 0) {
          log.info(
            `Rewriting ${resolved.externalSchemas.size} cross-package schema type(s)...`,
          );
          const dts = readFileSync(dtsPath, "utf8");
          writeFileSync(
            dtsPath,
            rewriteExternalSchemaTypes(dts, resolved.externalSchemas),
          );
        }

        log.info("Generating JSON bundle...");
        await bundleOpenApiToJson(resolved.rewrittenEntryPath, jsonPath);

        log.info("Generating per-operation and schema fragments...");
        const {
          generateOperationFragments,
          generateSchemaFragments,
        } = await import("./generate-fragments.ts");
        await generateOperationFragments(outputDir);
        generateSchemaFragments(outputDir, resolved.externalSchemas);

        log.info("✅ OpenAPI generation completed successfully!");
      } finally {
        resolved.cleanup();
      }
    });
};
