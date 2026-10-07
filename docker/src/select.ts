import { readFileSync } from "node:fs";
import path from "node:path";
import { findBuild, sanitizeImageName, type Build } from "./builds.ts";

/**
 * Image names (no registry, no tag; sanitized like build image names) of
 * every `image:` in a compose file.
 * A plain line scan rather than `docker compose config`, which needs every
 * `env_file` to exist.
 */
export function composeImageNames(composeYaml: string): string[] {
  const names = new Set<string>();
  for (const match of composeYaml.matchAll(/^\s*image:\s*["']?([^\s"'#]+)/gm)) {
    const ref = match[1].split("@")[0];
    const lastSegment = ref.slice(ref.lastIndexOf("/") + 1);
    names.add(sanitizeImageName(lastSegment.replace(/:[^:]*$/, "")));
  }
  return [...names];
}

export interface BuildSelection {
  /** Build refs or package names. */
  identifiers?: string[];
  /** Every build under these directories. */
  dirs?: string[];
  /** Every build whose image a service in these compose files uses. */
  composeFiles?: string[];
  /** Resolves relative `dirs` / `composeFiles` (default: process cwd). */
  cwd?: string;
}

/**
 * The union of builds selected by ref, directory and compose file; every
 * build when nothing is specified.
 */
export function selectBuilds(all: Build[], selection: BuildSelection): Build[] {
  const { identifiers = [], dirs = [], composeFiles = [] } = selection;
  const cwd = selection.cwd ?? process.cwd();
  if (identifiers.length + dirs.length + composeFiles.length === 0) return all;

  const selected = new Map<string, Build>();
  for (const id of identifiers) {
    const build = findBuild(all, id);
    if (!build) {
      throw new Error(
        `Unknown build "${id}". Known builds:\n  ${all.map((b) => b.ref).join("\n  ")}`,
      );
    }
    selected.set(build.ref, build);
  }
  for (const dir of dirs) {
    const abs = path.resolve(cwd, dir);
    const under = all.filter(
      (b) => b.dir === abs || b.dir.startsWith(abs + path.sep),
    );
    if (under.length === 0) throw new Error(`No builds under ${dir}`);
    under.forEach((b) => selected.set(b.ref, b));
  }
  for (const file of composeFiles) {
    const images = new Set(
      composeImageNames(readFileSync(path.resolve(cwd, file), "utf8")),
    );
    const used = all.filter((b) => images.has(b.image));
    if (used.length === 0)
      throw new Error(`No builds produce an image used in ${file}`);
    used.forEach((b) => selected.set(b.ref, b));
  }
  return [...selected.values()];
}
