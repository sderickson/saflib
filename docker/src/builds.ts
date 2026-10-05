import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { MonorepoContext } from "@saflib/monorepo/workspace";

/**
 * One buildable image. Identified by its build ref,
 * `<npm-package-name>/builds/<name>`.
 */
export interface Build {
  ref: string;
  packageName: string;
  buildName: string;
  /** Directory holding the template and the generated `Dockerfile`. */
  dir: string;
  templatePath: string;
  dockerfilePath: string;
  /** Image name (no registry, no tag). Also names the install stage dir. */
  image: string;
  /** Tags applied besides `latest` and the input tag (from `build.json`). */
  extraTags: string[];
}

/**
 * Optional `build.json` next to a build's `Dockerfile.template`.
 */
export interface BuildConfig {
  /** Overrides the derived image name (e.g. to keep a published name). */
  image?: string;
  /** Extra tags to apply and push alongside `latest` (e.g. a pinned version). */
  tags?: string[];
}

export const DEFAULT_BUILD_NAME = "default";
export const TEMPLATE_FILE = "Dockerfile.template";
export const BUILDS_DIR = "builds";

export function buildRef(packageName: string, buildName: string): string {
  return `${packageName}/${BUILDS_DIR}/${buildName}`;
}

/**
 * A valid Docker image name derived from `raw`: lowercase, every run of
 * characters other than `[a-z0-9]` collapsed to one `-` (Docker rejects names
 * like `x-__y__` whose separators mix `-` and `_`).
 */
export function sanitizeImageName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * `@scope/pkg` + build `default` → `scope-pkg`; other builds append their
 * name (`@scope/pkg` + `prod/arm` → `scope-pkg-prod-arm`).
 */
export function deriveImageName(
  packageName: string,
  buildName: string,
): string {
  return sanitizeImageName(
    buildName === DEFAULT_BUILD_NAME
      ? packageName
      : `${packageName}-${buildName}`,
  );
}

function readBuildConfig(dir: string): BuildConfig {
  const file = path.join(dir, "build.json");
  if (!existsSync(file)) return {};
  return JSON.parse(readFileSync(file, "utf8")) as BuildConfig;
}

function makeBuild(packageName: string, buildName: string, dir: string): Build {
  const config = readBuildConfig(dir);
  return {
    ref: buildRef(packageName, buildName),
    packageName,
    buildName,
    dir,
    templatePath: path.join(dir, TEMPLATE_FILE),
    dockerfilePath: path.join(dir, "Dockerfile"),
    image: config.image
      ? sanitizeImageName(config.image)
      : deriveImageName(packageName, buildName),
    extraTags: config.tags ?? [],
  };
}

/** Dirs under `buildsDir` (recursively) that contain a template. */
function findBuildDirs(buildsDir: string): string[] {
  const found: string[] = [];
  const visit = (dir: string) => {
    if (existsSync(path.join(dir, TEMPLATE_FILE))) found.push(dir);
    for (const entry of readdirSync(dir)) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      const child = path.join(dir, entry);
      if (statSync(child).isDirectory()) visit(child);
    }
  };
  visit(buildsDir);
  return found;
}

/**
 * All builds in the monorepo:
 * - a package-root `Dockerfile.template` is the package's `default` build;
 * - every `builds/<name…>/Dockerfile.template` is build `<name…>` (nested
 *   names allowed, e.g. `builds/prod/arm` → `prod/arm`).
 */
export function listBuilds(ctx: MonorepoContext): Build[] {
  const builds: Build[] = [];
  for (const packageName of Object.keys(
    ctx.monorepoPackageDirectories,
  ).sort()) {
    const packageDir = ctx.monorepoPackageDirectories[packageName];
    if (existsSync(path.join(packageDir, TEMPLATE_FILE))) {
      builds.push(makeBuild(packageName, DEFAULT_BUILD_NAME, packageDir));
    }
    const buildsDir = path.join(packageDir, BUILDS_DIR);
    if (existsSync(buildsDir) && statSync(buildsDir).isDirectory()) {
      for (const dir of findBuildDirs(buildsDir)) {
        const buildName = path
          .relative(buildsDir, dir)
          .split(path.sep)
          .join("/");
        builds.push(makeBuild(packageName, buildName, dir));
      }
    }
  }
  const byImage = new Map<string, string>();
  for (const build of builds) {
    const existing = byImage.get(build.image);
    if (existing) {
      throw new Error(
        `Builds ${existing} and ${build.ref} both produce image "${build.image}"; set "image" in one's build.json`,
      );
    }
    byImage.set(build.image, build.ref);
  }
  return builds;
}

/**
 * Resolves a user-supplied identifier — a build ref, or a bare package name
 * (meaning its `default` build) — to a build.
 */
export function findBuild(
  builds: Build[],
  identifier: string,
): Build | undefined {
  return (
    builds.find((b) => b.ref === identifier) ??
    builds.find(
      (b) => b.packageName === identifier && b.buildName === DEFAULT_BUILD_NAME,
    )
  );
}
