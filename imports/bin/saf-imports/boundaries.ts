import path from "node:path";
import type { Command } from "commander";
import {
  checkBoundaries,
  type BoundaryViolation,
} from "../../src/boundaries/check-boundaries.ts";
import {
  compareToBaseline,
  readBaseline,
  writeBaseline,
} from "../../src/boundaries/baseline.ts";
import { readRootSafImportsConfig } from "../../src/config/read-saf-imports-config.ts";

interface BoundariesOptions {
  root?: string;
  baseline?: string;
  updateBaseline?: boolean;
  all?: boolean;
}

const MAX_FILES_SHOWN = 5;

function printViolation(v: BoundaryViolation) {
  console.log(`  ${v.message}`);
  console.log(`    key: ${v.key}`);
  for (const file of v.files.slice(0, MAX_FILES_SHOWN)) {
    console.log(`    - ${file}`);
  }
  if (v.files.length > MAX_FILES_SHOWN) {
    console.log(`    … and ${v.files.length - MAX_FILES_SHOWN} more file(s)`);
  }
}

export const addBoundariesCommand = (program: Command) => {
  program
    .command("boundaries")
    .description(
      "Check package boundaries: undeclared workspace imports, relative imports leaving a package, runtime package cycles, and safImports.boundaries.rules",
    )
    .option("--root <dir>", "Monorepo root (default: auto-detect from cwd)")
    .option(
      "--baseline <file>",
      "Accepted-violations JSON (default: safImports.boundaries.baseline)",
    )
    .option(
      "--update-baseline",
      "Rewrite the baseline to the current violations",
    )
    .option(
      "--all",
      "Print every violation, not just ones missing from the baseline",
    )
    .action((options: BoundariesOptions) => {
      const updateBaseline =
        options.updateBaseline || process.argv.includes("--update-baseline");
      const result = checkBoundaries({ root: options.root });
      const config = readRootSafImportsConfig(result.rootDir).boundaries ?? {};
      const baselineRel = options.baseline ?? config.baseline;
      const baselinePath = baselineRel
        ? path.resolve(result.rootDir, baselineRel)
        : undefined;

      console.log(
        `Scanned ${result.filesScanned} file(s) in ${result.packagesScanned} package(s); ${result.violations.length} violation(s).`,
      );

      if (updateBaseline) {
        if (!baselinePath) {
          console.error(
            "No baseline path. Pass --baseline or set safImports.boundaries.baseline.",
          );
          process.exitCode = 1;
          return;
        }
        writeBaseline(baselinePath, result.violations);
        console.log(`Wrote ${path.relative(process.cwd(), baselinePath)}.`);
        return;
      }

      if (options.all) {
        for (const v of result.violations) printViolation(v);
      }

      const { added, stale } = compareToBaseline(
        result.violations,
        baselinePath ? readBaseline(baselinePath) : { violations: [] },
      );

      if (added.length > 0) {
        console.log(`\n${added.length} new violation(s):`);
        for (const v of added) printViolation(v);
      }
      if (stale.length > 0) {
        console.log(
          `\n${stale.length} baseline entr${stale.length === 1 ? "y is" : "ies are"} fixed; remove ${stale.length === 1 ? "it" : "them"} (or run with --update-baseline):`,
        );
        for (const key of stale) console.log(`  ${key}`);
      }
      if (added.length > 0 || stale.length > 0) {
        process.exitCode = 1;
        return;
      }
      console.log("No new boundary violations.");
    });
};
