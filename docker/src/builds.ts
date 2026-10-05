import path from "node:path";
import type { MonorepoContext } from "@saflib/monorepo/workspace";
import { imageNameFromPackageName } from "./docker.ts";

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
  dockerfilePath: string;
  image: string;
}

export const DEFAULT_BUILD_NAME = "default";

export function buildRef(packageName: string, buildName: string): string {
  return `${packageName}/builds/${buildName}`;
}

/**
 * All builds in the monorepo. A package-root `Dockerfile.template` is the
 * package's `default` build (its image name is unchanged from before build
 * refs existed).
 */
export function listBuilds(ctx: MonorepoContext): Build[] {
  return Array.from(ctx.packagesWithDockerfileTemplates)
    .sort()
    .map((packageName) => {
      const dir = ctx.monorepoPackageDirectories[packageName];
      return {
        ref: buildRef(packageName, DEFAULT_BUILD_NAME),
        packageName,
        buildName: DEFAULT_BUILD_NAME,
        dir,
        dockerfilePath: path.join(dir, "Dockerfile"),
        image: imageNameFromPackageName(packageName),
      };
    });
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
