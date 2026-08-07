import path from "node:path";
import type { Command } from "commander";
import {
  generateBaseline,
  diffBaseline,
  formatRegression,
} from "../../src/baseline/baseline.ts";

interface GenerateOptions {
  out: string;
  root?: string;
  skipTimings?: boolean;
  skipBundles?: boolean;
}

interface DiffOptions {
  baseline: string;
  root?: string;
}

export const addBaselineCommand = (program: Command) => {
  const baselineCmd = program
    .command("baseline")
    .description(
      "Generate or diff a committed import-graph baseline snapshot",
    )
    .action(() => {
      baselineCmd.outputHelp();
    });

  baselineCmd
    .command("generate")
    .description(
      "Measure all *.test.ts files, entry probes, and optional timings/bundles",
    )
    .requiredOption(
      "--out <path>",
      "Output JSON path (e.g. notes/…/baseline.json)",
    )
    .option("--root <dir>", "Monorepo root (default: auto-detect from cwd)")
    .option(
      "--skip-timings",
      "Skip suite and typecheck wall-time measurements",
    )
    .option(
      "--skip-bundles",
      "Skip frontend bundle measurement attempt",
    )
    .action((options: GenerateOptions) => {
      generateBaseline({
        outPath: path.resolve(options.out),
        root: options.root ? path.resolve(options.root) : undefined,
        skipTimings: options.skipTimings,
        skipBundles: options.skipBundles,
        onProgress: (msg) => console.error(msg),
      });
    });

  baselineCmd
    .command("diff")
    .description(
      "Compare current graphs to a committed baseline; report regressions (exit 0 in M0)",
    )
    .requiredOption(
      "--baseline <path>",
      "Path to committed baseline.json",
    )
    .option("--root <dir>", "Monorepo root (default: auto-detect from cwd)")
    .action((options: DiffOptions) => {
      try {
        const { regressions } = diffBaseline({
          baselinePath: path.resolve(options.baseline),
          root: options.root ? path.resolve(options.root) : undefined,
          onProgress: (msg) => console.error(msg),
        });

        if (regressions.length === 0) {
          console.log("OK: no import-graph regressions vs baseline.");
          return;
        }

        console.log(
          `WARN: ${regressions.length} regression(s) vs baseline (M0 report-only, exit 0):\n`,
        );
        for (const r of regressions) {
          console.log(`  ${formatRegression(r)}`);
        }
        // M0: always exit 0
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
};
