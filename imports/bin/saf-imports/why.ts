import path from "node:path";
import type { Command } from "commander";
import { findPath } from "../../index.ts";

interface WhyOptions {
  includeTypes?: boolean;
  root?: string;
}

export const addWhyCommand = (program: Command) => {
  program
    .command("why")
    .description(
      "Print the shortest import path from an entry file to a target module or package",
    )
    .argument("<entry>", "Entry file path (typically a *.test.ts)")
    .argument(
      "<target>",
      "Workspace file, workspace package name, or external root (e.g. stripe)",
    )
    .option("--include-types", "Include type-only imports in the graph")
    .option("--root <dir>", "Monorepo root (default: auto-detect)")
    .action((entry: string, target: string, options: WhyOptions) => {
      const chain = findPath(path.resolve(entry), target, {
        includeTypes: options.includeTypes,
        root: options.root ? path.resolve(options.root) : undefined,
      });

      if (!chain) {
        console.error(`No import path from ${entry} to ${target}`);
        process.exitCode = 1;
        return;
      }

      console.log(chain[0]);
      for (let i = 1; i < chain.length; i++) {
        console.log(`  → ${chain[i]}`);
      }
    });
};
