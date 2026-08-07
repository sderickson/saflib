import path from "node:path";
import type { Command } from "commander";
import { measureGraph } from "../../index.ts";

interface MeasureOptions {
  json?: boolean;
  includeTypes?: boolean;
  root?: string;
}

function printTable(
  rows: { entry: string; modules: number; lines: number; ext: number }[],
) {
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

export const addMeasureCommand = (program: Command) => {
  program
    .command("measure")
    .description(
      "Walk the static import graph from one or more entry files and report module counts",
    )
    .argument("<entry...>", "Entry file path(s) to measure (typically *.test.ts)")
    .option("--json", "Machine-readable JSON output")
    .option("--include-types", "Include type-only imports in the graph")
    .option("--root <dir>", "Monorepo root (default: auto-detect)")
    .action((entries: string[], options: MeasureOptions) => {
      const rows = entries.map((entry) => {
        const result = measureGraph(path.resolve(entry), {
          includeTypes: options.includeTypes,
          root: options.root ? path.resolve(options.root) : undefined,
        });
        return {
          entry,
          modules: result.modules,
          lines: result.lines,
          ext: result.ext,
        };
      });

      if (options.json) {
        console.log(JSON.stringify(rows.length === 1 ? rows[0] : rows, null, 2));
      } else {
        printTable(rows);
      }
    });
};
