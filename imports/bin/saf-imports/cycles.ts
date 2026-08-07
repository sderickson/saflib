import path from "node:path";
import type { Command } from "commander";
import { detectCycles } from "../../index.ts";

interface CyclesOptions {
  package?: string;
  includeTypes?: boolean;
  root?: string;
}

export const addCyclesCommand = (program: Command) => {
  program
    .command("cycles")
    .description(
      "Detect circular dependencies in the first-party import graph",
    )
    .option(
      "--package <name>",
      "Limit detection to files in one workspace package",
    )
    .option("--include-types", "Include type-only imports in the graph")
    .option("--root <dir>", "Monorepo root (default: auto-detect from cwd)")
    .action((options: CyclesOptions) => {
      const { cycles, error } = detectCycles({
        packageName: options.package,
        includeTypes: options.includeTypes,
        root: options.root ? path.resolve(options.root) : undefined,
      });

      if (error) {
        console.error(error);
        process.exitCode = 1;
        return;
      }

      if (cycles.length === 0) {
        console.log("No cycles found.");
        return;
      }

      console.log(`Found ${cycles.length} cycle(s):\n`);
      for (const cycle of cycles) {
        const rel = cycle.map((f) => path.relative(process.cwd(), f) || f);
        console.log(rel.join("\n  → "));
        console.log();
      }
      process.exitCode = 1;
    });
};
