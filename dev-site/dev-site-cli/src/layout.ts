import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

export interface DevLayout {
  /** Absolute product dev/ directory (e.g. …/my-product/dev). */
  devDir: string;
  /** Host path bind-mounted at /repo in the site container. */
  repoMount: string;
  /** saflib root on the host. */
  saflibRoot: string;
  /** Product scope within the repo (e.g. my-product, base). */
  productRoot: string;
  /** SAFLIB_ROOT inside the container. */
  containerSaflibRoot: string;
  /** When set, compose should apply the submodule git-dir overlay. */
  gitDirMount?: string;
  /**
   * When the repo checkout is a linked git worktree: the main repository's `.git`
   * directory. The checkout's `.git` file points into it by absolute host path, so
   * compose mounts it at that same path for git to work inside the site container.
   */
  worktreeGitCommonDir?: string;
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
    isGitfile(path.join(saflibRoot, ".git"))
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
    worktreeGitCommonDir: resolveWorktreeGitCommonDir(repoMount),
  };
}

/**
 * For a linked worktree (`.git` is a file pointing at `<main>/.git/worktrees/<name>`),
 * returns the main repository's `.git` directory; otherwise undefined.
 */
export function resolveWorktreeGitCommonDir(
  checkoutRoot: string,
): string | undefined {
  const gitPath = path.join(checkoutRoot, ".git");
  if (!isGitfile(gitPath)) return undefined;
  const gitDir = path.resolve(
    checkoutRoot,
    readFileSync(gitPath, "utf8").slice("gitdir:".length).trim(),
  );
  const commonDirFile = path.join(gitDir, "commondir");
  if (!existsSync(commonDirFile)) return undefined;
  return path.resolve(gitDir, readFileSync(commonDirFile, "utf8").trim());
}

function isGitfile(gitPath: string): boolean {
  if (!existsSync(gitPath)) return false;
  try {
    const content = readFileSync(gitPath, "utf8");
    return content.startsWith("gitdir:");
  } catch {
    return false;
  }
}
