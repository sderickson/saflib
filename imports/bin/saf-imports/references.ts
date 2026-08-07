import path from "node:path";
import type { Command } from "commander";
import {
  buildReferenceGraph,
  detectReferenceCycles,
  previewReferencesGenerate,
} from "../../src/references/index.ts";

interface ReferencesRootOptions {
  root?: string;
}

interface GenerateOptions extends ReferencesRootOptions {
  write?: boolean;
}

function formatCycle(cycle: string[]): string {
  return cycle.join(" → ");
}

export const addReferencesCommand = (program: Command) => {
  const referencesCmd = program
    .command("references")
    .description(
      "TypeScript project-reference graph helpers (generate, cycles, check)",
    )
    .action(() => {
      referencesCmd.outputHelp();
    });

  referencesCmd
    .command("cycles")
    .description(
      "Detect circular workspace dependencies in the package-level reference graph",
    )
    .option("--root <dir>", "Monorepo root (default: auto-detect from cwd)")
    .action((options: ReferencesRootOptions) => {
      const root = options.root ? path.resolve(options.root) : undefined;
      const { graph, missingTsconfig, skippedMeta, rootDir } =
        buildReferenceGraph(root);
      const cycles = detectReferenceCycles(graph);

      console.log(`Reference graph root: ${rootDir}`);
      console.log(
        `Packages: ${graph.size} typecheckable, ${missingTsconfig.length} missing tsconfig, ${skippedMeta.length} meta skipped`,
      );

      if (cycles.length === 0) {
        console.log("No reference cycles found.");
        return;
      }

      console.log(`\nFound ${cycles.length} cycle(s):\n`);
      console.log(
        `${"#".padEnd(4)}${"Length".padEnd(8)}Path`,
      );
      cycles.forEach((cycle, i) => {
        const nodes = cycle.length - 1;
        console.log(
          `${String(i + 1).padEnd(4)}${String(nodes).padEnd(8)}${formatCycle(cycle)}`,
        );
      });
      console.log(
        "\nRemediation: merge packages, extract shared types to a third package, or remove a spurious dependency. Do not omit edges to hide cycles.",
      );
      process.exitCode = 1;
    });

  referencesCmd
    .command("generate")
    .description(
      "Preview package tsconfig references from the workspace dependency graph (phase 1: stdout only)",
    )
    .option("--root <dir>", "Monorepo root (default: auto-detect from cwd)")
    .option(
      "--write",
      "Write references to disk (stubbed in phase 1 — preview only)",
    )
    .action((options: GenerateOptions) => {
      const preview = previewReferencesGenerate({
        root: options.root ? path.resolve(options.root) : undefined,
        write: options.write,
      });

      if (options.write) {
        console.error(
          "Note: --write is not implemented yet (phase 4). Printing preview only.",
        );
      }

      console.log(JSON.stringify(preview, null, 2));
    });
};
