import path from "node:path";
import type { Command } from "commander";
import {
  buildReferenceGraph,
  checkReferences,
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

function relFromCwd(absPath: string): string {
  return path.relative(process.cwd(), absPath) || absPath;
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
      console.log(`${"#".padEnd(4)}${"Length".padEnd(8)}Path`);
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
      "Generate package and solution tsconfig references from the workspace dependency graph",
    )
    .option("--root <dir>", "Monorepo root (default: auto-detect from cwd)")
    .option("--write", "Write references to package and solution tsconfigs")
    .action((options: GenerateOptions) => {
      const preview = previewReferencesGenerate({
        root: options.root ? path.resolve(options.root) : undefined,
        write: options.write,
      });

      if (options.write) {
        console.log(`Reference generate root: ${preview.rootDir}`);
        console.log(
          `Wrote ${preview.written.length} file(s); ${preview.unchanged.length} unchanged.`,
        );
        for (const file of preview.written) {
          console.log(`  wrote ${relFromCwd(file)}`);
        }
        if (preview.missingTsconfig.length > 0) {
          console.log(
            `\nMissing tsconfig (${preview.missingTsconfig.length}): ${preview.missingTsconfig.join(", ")}`,
          );
        }
        return;
      }

      console.log(JSON.stringify(preview, null, 2));
    });

  referencesCmd
    .command("check")
    .description(
      "Fail if on-disk tsconfig references drift from generated output, or if the graph has cycles",
    )
    .option("--root <dir>", "Monorepo root (default: auto-detect from cwd)")
    .action((options: ReferencesRootOptions) => {
      const result = checkReferences({
        root: options.root ? path.resolve(options.root) : undefined,
      });

      console.log(`Reference check root: ${result.rootDir}`);

      if (result.cycles.length > 0) {
        console.log(`\nFound ${result.cycles.length} cycle(s):\n`);
        result.cycles.forEach((cycle, i) => {
          console.log(`  ${i + 1}. ${formatCycle(cycle)}`);
        });
      }

      if (result.drifts.length > 0) {
        console.log(`\nFound ${result.drifts.length} drift(s):\n`);
        for (const drift of result.drifts) {
          console.log(`  ${relFromCwd(drift.tsconfig)}`);
          console.log(
            `    expected: ${JSON.stringify(drift.expected.map((r) => r.path))}`,
          );
          console.log(
            `    actual:   ${JSON.stringify(drift.actual.map((r) => r.path))}`,
          );
        }
        console.log(
          "\nRemediation: run `saf-imports references generate --write`.",
        );
      }

      if (result.ok) {
        console.log("References check passed.");
        return;
      }

      process.exitCode = 1;
    });
};
