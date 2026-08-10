import path from "node:path";
import type { Command } from "commander";
import {
  generateSnapshot,
  checkSnapshot,
  formatRegression,
  isFatalSnapshotRegression,
  isRoutePageChunkRegression,
} from "../../src/snapshot/snapshot.ts";

interface GenerateOptions {
  out: string;
  root?: string;
  skipTimings?: boolean;
  skipBundles?: boolean;
}

interface CheckOptions {
  against: string;
  root?: string;
  mode?: "warn" | "error";
}

export const addSnapshotCommand = (program: Command) => {
  const snapshotCmd = program
    .command("snapshot")
    .description(
      "Generate or check an import-graph metrics snapshot",
    )
    .action(() => {
      snapshotCmd.outputHelp();
    });

  snapshotCmd
    .command("generate")
    .description(
      "Measure all *.test.ts files, entry probes, and optional timings/bundles",
    )
    .requiredOption(
      "--out <path>",
      "Output JSON path (e.g. notes/…/snapshot.json)",
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
      generateSnapshot({
        outPath: path.resolve(options.out),
        root: options.root ? path.resolve(options.root) : undefined,
        skipTimings: options.skipTimings,
        skipBundles: options.skipBundles,
        onProgress: (msg) => console.error(msg),
      });
    });

  snapshotCmd
    .command("check")
    .description(
      "Compare current graphs to a saved snapshot; report regressions",
    )
    .requiredOption(
      "--against <path>",
      "Path to a snapshot JSON from generate",
    )
    .option("--root <dir>", "Monorepo root (default: auto-detect from cwd)")
    .option(
      "--mode <mode>",
      "warn (default) or error — route page-chunk timing stays warn-only",
      "warn",
    )
    .action((options: CheckOptions) => {
      try {
        const mode = options.mode === "error" ? "error" : "warn";
        const { regressions } = checkSnapshot({
          againstPath: path.resolve(options.against),
          root: options.root ? path.resolve(options.root) : undefined,
          mode,
          onProgress: (msg) => console.error(msg),
        });

        const fatal = regressions.filter(isFatalSnapshotRegression);
        const routeWarns = regressions.filter(isRoutePageChunkRegression);

        if (regressions.length === 0) {
          console.log("OK: no import-graph regressions vs snapshot.");
          return;
        }

        if (fatal.length > 0) {
          const label =
            mode === "error"
              ? `ERROR: ${fatal.length} regression(s) vs snapshot`
              : `WARN: ${fatal.length} regression(s) vs snapshot (exit 0 in warn mode)`;
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
