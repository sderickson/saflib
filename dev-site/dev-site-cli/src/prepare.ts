import { existsSync, writeFileSync, chmodSync } from "node:fs";
import path from "node:path";
import { writeClaudeCredentials, writeCursorCredentials } from "./agent-credentials.ts";
import { writeDevSiteEnv } from "./dev-site-env.ts";

/**
 * Creates an empty `.env` when missing. The stack lists it as an `env_file` for
 * optional local overrides, and compose refuses to start without the file, e.g.
 * in a fresh clone or a new git worktree.
 */
export function ensureLocalEnvFile(devDir: string): void {
  const envPath = path.join(devDir, ".env");
  if (existsSync(envPath)) return;
  writeFileSync(envPath, "");
  chmodSync(envPath, 0o600);
  console.error("dev-site: created empty .env (add local overrides there)");
}

/** Writes dev-site.env, an empty .env if missing, and agent credential placeholders for compose. */
export function prepareDevStack(devDir: string): void {
  ensureLocalEnvFile(devDir);
  writeDevSiteEnv(devDir);
  writeClaudeCredentials(devDir);
  writeCursorCredentials(devDir);
}
