import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { resolveDevLayout } from "./layout.ts";

export type ComposeStackKind = "stack" | "dev-site";

export interface ComposeInvocation {
  cwd: string;
  composeFiles: string[];
  envFiles: string[];
}

function devSiteEnvIncludes(devDir: string, key: string): boolean {
  const envPath = path.join(devDir, "dev-site.env");
  if (!existsSync(envPath)) return false;
  return readFileSync(envPath, "utf8").includes(`${key}=`);
}

function devSiteEnvHasGitDirOverlay(devDir: string): boolean {
  return devSiteEnvIncludes(devDir, "DEV_SITE_GIT_DIR_MOUNT");
}

/** Overlay mounting the main repo's .git for a worktree checkout (see DevLayout). */
export const WORKTREE_OVERLAY_FILE = "docker-compose.worktree.yaml";

function useWorktreeOverlay(devDir: string, isWorktree: boolean): boolean {
  return (
    existsSync(path.join(devDir, WORKTREE_OVERLAY_FILE)) &&
    (isWorktree || devSiteEnvIncludes(devDir, "DEV_SITE_GIT_COMMON_DIR"))
  );
}

/** Compose `-f` / `--env-file` lists for a product dev directory. */
export function resolveComposeInvocation(
  devDir: string,
  kind: ComposeStackKind,
): ComposeInvocation {
  const cwd = path.resolve(devDir);
  const layout = resolveDevLayout(cwd);
  const useSubmoduleOverlay =
    layout.gitDirMount !== undefined || devSiteEnvHasGitDirOverlay(cwd);
  const worktreeOverlay = useWorktreeOverlay(
    cwd,
    layout.worktreeGitCommonDir !== undefined,
  );

  if (kind === "dev-site") {
    const composeFiles = ["docker-compose.dev-site.yaml"];
    if (useSubmoduleOverlay) {
      composeFiles.push("docker-compose.dev-site.submodule.yaml");
    }
    if (worktreeOverlay) {
      composeFiles.push(WORKTREE_OVERLAY_FILE);
    }
    return { cwd, composeFiles, envFiles: ["dev-site.env"] };
  }

  const composeFiles = ["docker-compose.yaml"];
  if (useSubmoduleOverlay) {
    composeFiles.push("docker-compose.submodule.yaml");
  }
  if (worktreeOverlay) {
    composeFiles.push(WORKTREE_OVERLAY_FILE);
  }
  return {
    cwd,
    composeFiles,
    envFiles: ["env.dev", ".env", "dev-site.env"],
  };
}

export function dockerComposeArgv(invocation: ComposeInvocation): string[] {
  const args: string[] = [];
  for (const envFile of invocation.envFiles) {
    if (existsSync(path.join(invocation.cwd, envFile))) {
      args.push("--env-file", envFile);
    }
  }
  for (const file of invocation.composeFiles) {
    args.push("-f", file);
  }
  return args;
}
