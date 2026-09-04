#!/usr/bin/env -S node --experimental-strip-types --disable-warning=ExperimentalWarning
import path from "node:path";
import type { Command } from "commander";
import {
  checkExports,
  generateExports,
  resolvePackageDir,
} from "../../src/exports/generate-exports.ts";

interface ExportsOptions {
  package?: string;
  root?: string;
}

export const addExportsCommand = (program: Command) => {
  const exportsCmd = program
    .command("exports")
    .description(
      "Generate or verify package.json exports maps from directory structure",
    )
    .action(() => {
      exportsCmd.outputHelp();
    });

  exportsCmd
    .command("generate")
    .description(
      "Write heuristic exports map into package.json (refuses WORKFLOW AREA packages)",
    )
    .requiredOption(
      "--package <name>",
      "Workspace package name (e.g. @saflib/monorepo)",
    )
    .option("--root <dir>", "Monorepo root (default: auto-detect from cwd)")
    .action((options: ExportsOptions) => {
      const { dir, error } = resolvePackageDir(
        options.package!,
        options.root ? path.resolve(options.root) : undefined,
      );
      if (error) {
        console.error(error);
        process.exitCode = 1;
        return;
      }

      const result = generateExports(dir);
      if (result.error) {
        console.error(result.error);
        process.exitCode = 1;
        return;
      }

      console.log(
        `Wrote ${Object.keys(result.exports).length} export(s) to ${path.join(dir, "package.json")}`,
      );
      for (const [k, v] of Object.entries(result.exports)) {
        console.log(`  ${k} → ${v}`);
      }
    });

  exportsCmd
    .command("check")
    .description(
      "Verify committed exports match heuristic generation; exit 1 on mismatch",
    )
    .requiredOption(
      "--package <name>",
      "Workspace package name (e.g. @saflib/monorepo)",
    )
    .option("--root <dir>", "Monorepo root (default: auto-detect from cwd)")
    .action((options: ExportsOptions) => {
      const { dir, error } = resolvePackageDir(
        options.package!,
        options.root ? path.resolve(options.root) : undefined,
      );
      if (error) {
        console.error(error);
        process.exitCode = 1;
        return;
      }

      const result = checkExports(dir);
      if (result.ok) {
        const usesPatterns = Object.keys(result.actual).some((k) =>
          k.includes("*"),
        );
        const mode = usesPatterns ? "pattern coverage" : "heuristic";
        console.log(
          `OK: exports for ${options.package} (${mode}, ${Object.keys(result.expected).length} files).`,
        );
        return;
      }

      console.error(
        `Exports mismatch for ${options.package} (${result.diffs.length}):\n`,
      );
      for (const d of result.diffs) {
        console.error(`  ${d}`);
      }
      console.error(
        `\nRun: npm exec saf-monorepo exports generate -- --package ${options.package}`,
      );
      process.exitCode = 1;
    });
};
