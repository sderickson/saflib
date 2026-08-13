import fs from "node:fs";
import path from "node:path";

/** Same on-disk location the daemon HTTP service uses by default. */
export const DAEMON_DEV_SITE_DB_REL =
  "daemon/dev-site/service/http/data/dev-site.sqlite";

export function resolveRepoRoot(explicit?: string): string {
  return explicit || process.env.DEV_SITE_REPO_ROOT || process.cwd();
}

/**
 * Prefer explicit `--db`, then `DEV_SITE_DB_PATH`, then the daemon service
 * sqlite beside `daemon/dev-site/service/http` (when present), else the
 * library on-disk default (`true` → `@saflib/dev-site-db/data/`).
 */
export function resolveDbPath(
  repoRoot: string,
  explicit?: string,
): string | true {
  if (explicit) return explicit;
  if (process.env.DEV_SITE_DB_PATH) return process.env.DEV_SITE_DB_PATH;
  const daemonDb = path.resolve(repoRoot, DAEMON_DEV_SITE_DB_REL);
  if (fs.existsSync(daemonDb)) return daemonDb;
  return true;
}

/**
 * Prefer explicit `--product-root`, then `DEV_SITE_PRODUCT_ROOT`, then
 * `daemon` when using the daemon sqlite, else whole-repo (`""`).
 */
export function resolveProductRoot(
  explicit: string | undefined,
  dbPath: string | true,
): string {
  if (explicit !== undefined && explicit !== "") return explicit;
  if (process.env.DEV_SITE_PRODUCT_ROOT !== undefined) {
    return process.env.DEV_SITE_PRODUCT_ROOT;
  }
  if (
    typeof dbPath === "string" &&
    dbPath.replace(/\\/g, "/").includes("daemon/dev-site/")
  ) {
    return "daemon";
  }
  return "";
}

export function resolveMainRef(explicit?: string): string {
  return explicit || process.env.DEV_SITE_MAIN_REF || "main";
}
