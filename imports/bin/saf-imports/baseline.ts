import path from "node:path";
import type { Command } from "commander";
import {
  generateBaseline,
  diffBaseline,
  formatRegression,
  isFatalBaselineRegression,
  isRoutePageChunkRegression,
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
  mode?: "warn" | "error";
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
      "Compare current graphs to a committed baseline; report regressions",
    )
    .requiredOption(
      "--baseline <path>",
      "Path to committed baseline.json",
    )
    .option("--root <dir>", "Monorepo root (default: auto-detect from cwd)")
    .option(
      "--mode <mode>",
      "warn (default) or error — route page-chunk timing stays warn-only",
      "warn",
    )
    .action((options: DiffOptions) => {
      try {
        const mode = options.mode === "error" ? "error" : "warn";
        const { regressions } = diffBaseline({
          baselinePath: path.resolve(options.baseline),
          root: options.root ? path.resolve(options.root) : undefined,
          mode,
          onProgress: (msg) => console.error(msg),
        });

        const fatal = regressions.filter(isFatalBaselineRegression);
        const routeWarns = regressions.filter(isRoutePageChunkRegression);

        if (regressions.length === 0) {
          console.log("OK: no import-graph regressions vs baseline.");
          return;
        }

        if (fatal.length > 0) {
          const label =
            mode === "error"
              ? `ERROR: ${fatal.length} regression(s) vs baseline`
              : `WARN: ${fatal.length} regression(s) vs baseline (exit 0 in warn mode)`;
          console.log(`${label}:\n`);
          for (const r of fatal) {
            console.log(`  ${formatRegression(r)}`);
          }
        }

        if (routeWarns.length > 0) {
          console.log(
            `\nWARN: ${routeWarns.length} route page-chunk regression(s) (warn-only):\n`,
          );
          for (const r of routeWarns) {
            console.log(`  ${formatRegression(r)}`);
          }
        }

        if (mode === "error" && fatal.length > 0) {
          process.exitCode = 1;
        }
      } catch (err) {
        console.error(err instanceof Error ? err.message : String(err));
        process.exitCode = 1;
      }
    });
};
