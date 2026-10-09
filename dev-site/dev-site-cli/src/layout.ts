import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export interface DevLayout {
  /** Absolute product dev/ directory (e.g. …/daemon/dev). */
  devDir: string;
  /** Host path bind-mounted at /repo in the site container. */
  repoMount: string;
  /** saflib root on the host. */
  saflibRoot: string;
  /** Product scope within the repo (e.g. daemon, base). */
  productRoot: string;
  /** SAFLIB_ROOT inside the container. */
  containerSaflibRoot: string;
  /** When set, compose should apply the submodule git-dir overlay. */
  gitDirMount?: string;
}

/**
 * Detect monorepo (product beside saflib/) vs saflib-repo (base/dev) layout.
 */
export function resolveDevLayout(devDir: string): DevLayout {
  const absoluteDevDir = path.resolve(devDir);
  const productParent = path.dirname(absoluteDevDir);
  const monorepoMarker = path.join(absoluteDevDir, "../../saflib/base");

  let repoMount: string;
  let saflibRoot: string;
  let productRoot: string;

  if (existsSync(monorepoMarker)) {
    repoMount = path.resolve(absoluteDevDir, "../..");
    saflibRoot = path.join(repoMount, "saflib");
    productRoot = path.basename(productParent);
  } else {
    saflibRoot = path.resolve(absoluteDevDir, "../..");
    repoMount = saflibRoot;
    productRoot = "base";
  }

  const containerSaflibRoot = existsSync(path.join(repoMount, "saflib"))
    ? "/repo/saflib"
    : "/repo";

  let gitDirMount: string | undefined;
  if (
    repoMount === saflibRoot &&
    isSaflibGitfile(path.join(saflibRoot, ".git"))
  ) {
    const candidate = path.join(
      path.dirname(saflibRoot),
      ".git/modules/saflib",
    );
    if (existsSync(candidate)) {
      gitDirMount = candidate;
    }
  }

  return {
    devDir: absoluteDevDir,
    repoMount,
    saflibRoot,
    productRoot,
    containerSaflibRoot,
    gitDirMount,
  };
}

function isSaflibGitfile(gitPath: string): boolean {
  if (!existsSync(gitPath)) return false;
  try {
    const content = readFileSync(gitPath, "utf8");
    return content.startsWith("gitdir:");
  } catch {
    return false;
  }
}
