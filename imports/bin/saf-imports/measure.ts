import path from "node:path";
import type { Command } from "commander";
import { measureGraph } from "../../index.ts";

interface MeasureRow {
  entry: string;
  modules: number;
  lines: number;
  ext: number;
  files?: string[];
  externals?: string[];
}

interface MeasureOptions {
  json?: boolean;
  includeTypes?: boolean;
  verbose?: boolean;
  root?: string;
}

function printTable(rows: MeasureRow[]) {
  const headers = ["entry", "modules", "lines", "ext"] as const;
  const widths = {
    entry: Math.max(
      headers[0].length,
      ...rows.map((r) => r.entry.length),
    ),
    modules: Math.max(
      headers[1].length,
      ...rows.map((r) => String(r.modules).length),
    ),
    lines: Math.max(
      headers[2].length,
      ...rows.map((r) => String(r.lines).length),
    ),
    ext: Math.max(headers[3].length, ...rows.map((r) => String(r.ext).length)),
  };

  const pad = (s: string, w: number, right = false) =>
    right ? s.padStart(w) : s.padEnd(w);

  console.log(
    `${pad(headers[0], widths.entry)}  ${pad(headers[1], widths.modules, true)}  ${pad(headers[2], widths.lines, true)}  ${pad(headers[3], widths.ext, true)}`,
  );
  for (const row of rows) {
    console.log(
      `${pad(row.entry, widths.entry)}  ${pad(String(row.modules), widths.modules, true)}  ${pad(String(row.lines), widths.lines, true)}  ${pad(String(row.ext), widths.ext, true)}`,
    );
  }
}

function printVerboseLists(row: MeasureRow) {
  const files = row.files ?? [];
  const externals = row.externals ?? [];

  console.log(`first-party (${files.length}):`);
  for (const file of files) {
    console.log(`  ${file}`);
  }

  console.log(`externals (${externals.length}):`);
  for (const pkg of externals) {
    console.log(`  ${pkg}`);
  }
}

export const addMeasureCommand = (program: Command) => {
  program
    .command("measure")
    .description(
      "Walk the static import graph from one or more entry files and report module counts",
    )
    .argument("<entry...>", "Entry file path(s) to measure (typically *.test.ts)")
    .option("--json", "Machine-readable JSON output")
    .option("--include-types", "Include type-only imports in the graph")
    .option(
      "--verbose",
      "List every first-party file path and external package in the graph",
    )
    .option("--root <dir>", "Monorepo root (default: auto-detect)")
    .action((entries: string[], options: MeasureOptions) => {
      const rows: MeasureRow[] = entries.map((entry) => {
        const result = measureGraph(path.resolve(entry), {
          includeTypes: options.includeTypes,
          verbose: options.verbose,
          root: options.root ? path.resolve(options.root) : undefined,
        });
        return {
          entry,
          modules: result.modules,
          lines: result.lines,
          ext: result.ext,
          files: result.files,
          externals: result.externals,
        };
      });

      if (options.json) {
        console.log(JSON.stringify(rows.length === 1 ? rows[0] : rows, null, 2));
        return;
      }

      printTable(rows);

      if (options.verbose) {
        for (const [i, row] of rows.entries()) {
          if (rows.length > 1) {
            console.log("");
            console.log(`--- ${row.entry} ---`);
          } else {
            console.log("");
          }
          printVerboseLists(row);
          if (i < rows.length - 1) {
            console.log("");
          }
        }
      }
    });
};
