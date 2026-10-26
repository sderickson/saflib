import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { resolveDevLayout } from "./layout.ts";

export type ComposeStackKind = "stack" | "dev-site";

export interface ComposeInvocation {
  cwd: string;
  composeFiles: string[];
  envFiles: string[];
}

function devSiteEnvHasGitDirOverlay(devDir: string): boolean {
  const envPath = path.join(devDir, "dev-site.env");
  if (!existsSync(envPath)) return false;
  return readFileSync(envPath, "utf8").includes("DEV_SITE_GIT_DIR_MOUNT=");
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

  if (kind === "dev-site") {
    const composeFiles = ["docker-compose.dev-site.yaml"];
    if (useSubmoduleOverlay) {
      composeFiles.push("docker-compose.dev-site.submodule.yaml");
    }
    return { cwd, composeFiles, envFiles: ["dev-site.env"] };
  }

  const composeFiles = ["docker-compose.yaml"];
  if (useSubmoduleOverlay) {
    composeFiles.push("docker-compose.submodule.yaml");
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
