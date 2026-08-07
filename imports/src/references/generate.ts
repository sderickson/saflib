import path from "node:path";
import {
  buildReferenceGraph,
  type BuildReferenceGraphResult,
} from "./build-graph.ts";

export interface PackageReferencePreview {
  package: string;
  tsconfig: string;
  references: { path: string }[];
}

export interface GenerateReferencesPreview {
  rootDir: string;
  write: boolean;
  /** Phase 1: `--write` is a no-op stub until phase 4. */
  writeSupported: false;
  packages: PackageReferencePreview[];
  missingTsconfig: string[];
  skippedMeta: string[];
}

function relativeReferencePath(
  fromDir: string,
  toDir: string,
): string {
  let rel = path.relative(fromDir, toDir);
  if (!rel.startsWith(".") && !path.isAbsolute(rel)) {
    rel = `./${rel}`;
  }
  // Prefer POSIX-style separators in generated JSON for stable diffs.
  return rel.split(path.sep).join("/");
}

/**
 * Preview the project-reference arrays that would be written to each package
 * tsconfig. Phase 1: stdout-only; `--write` is accepted but not applied.
 */
export function previewReferencesGenerate(options: {
  root?: string;
  write?: boolean;
}): GenerateReferencesPreview {
  const built: BuildReferenceGraphResult = buildReferenceGraph(options.root);
  const packages: PackageReferencePreview[] = [];

  for (const node of [...built.graph.values()].sort((a, b) =>
    a.name.localeCompare(b.name),
  )) {
    const refs = node.references
      .map((depName) => {
        const dep = built.graph.get(depName)!;
        return { path: relativeReferencePath(node.dir, dep.dir) };
      })
      .sort((a, b) => a.path.localeCompare(b.path));

    packages.push({
      package: node.name,
      tsconfig: path.join(node.dir, node.tsconfigEntry),
      references: refs,
    });
  }

  return {
    rootDir: built.rootDir,
    write: Boolean(options.write),
    writeSupported: false,
    packages,
    missingTsconfig: built.missingTsconfig,
    skippedMeta: built.skippedMeta,
  };
}
