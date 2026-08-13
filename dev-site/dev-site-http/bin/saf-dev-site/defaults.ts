import { execFileSync } from "node:child_process";
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

/**
 * Like {@link resolveProductRoot}, but when the result would be whole-repo and
 * `daemon/` exists under the repo (typical PathClerk layout), prefer `daemon`
 * for workdir scans.
 */
export function resolveWorkdirProductRoot(
  repoRoot: string,
  explicit: string | undefined,
  dbPath: string | true,
): string {
  const fromDefaults = resolveProductRoot(explicit, dbPath);
  if (fromDefaults) return fromDefaults;
  if (explicit !== undefined) return explicit;
  if (fs.existsSync(path.resolve(repoRoot, "daemon"))) return "daemon";
  return "";
}

export function isDaemonSharedDbPath(dbPath: string): boolean {
  const normalized = dbPath.replace(/\\/g, "/");
  return (
    normalized.endsWith(`/${DAEMON_DEV_SITE_DB_REL}`) ||
    normalized.endsWith(DAEMON_DEV_SITE_DB_REL)
  );
}

export class DbInUseError extends Error {
  constructor(dbPath: string, detail: string) {
    super(
      `Refusing to open ${dbPath}: ${detail}. ` +
        "Stop the Docker api (`npm run dev` in daemon/dev-site/dev) or pass --db / DEV_SITE_DB_PATH to a separate file.",
    );
    this.name = "DbInUseError";
  }
}

/** PIDs (excluding this process) with the sqlite / WAL / shm open. */
export function listSqliteHolderPids(dbPath: string): number[] {
  const candidates = [dbPath, `${dbPath}-wal`, `${dbPath}-shm`].filter((p) =>
    fs.existsSync(p),
  );
  if (candidates.length === 0) return [];
  try {
    const out = execFileSync("lsof", ["-t", "--", ...candidates], {
      encoding: "utf8",
      timeout: 5000,
      stdio: ["ignore", "pipe", "ignore"],
    });
    return [
      ...new Set(
        out
          .trim()
          .split(/\s+/)
          .map((s) => Number(s))
          .filter((n) => Number.isFinite(n) && n > 0 && n !== process.pid),
      ),
    ];
  } catch (e: unknown) {
    // lsof exits 1 when nothing holds the files.
    if (
      typeof e === "object" &&
      e !== null &&
      "status" in e &&
      (e as { status?: number }).status === 1
    ) {
      return [];
    }
    return [];
  }
}

/**
 * True when compose service `api` under `daemon/dev-site/dev` is running.
 * Backup when host `lsof` cannot see the VM-side holder.
 */
export function isDevSiteDockerApiRunning(): boolean {
  try {
    const out = execFileSync(
      "docker",
      [
        "ps",
        "--filter",
        "label=com.docker.compose.service=api",
        "--format",
        `{{.Label "com.docker.compose.project.working_dir"}}`,
      ],
      {
        encoding: "utf8",
        timeout: 8000,
        stdio: ["ignore", "pipe", "ignore"],
      },
    );
    return out
      .split("\n")
      .map((line) => line.trim().replace(/\\/g, "/"))
      .some((dir) => /\/daemon\/dev-site\/dev\/?$/.test(dir));
  } catch {
    return false;
  }
}

export type CliDbAccess = "read" | "write";

export type AssertCliMayOpenDbDeps = {
  listHolderPids?: (dbPath: string) => number[];
  isDevSiteDockerApiRunning?: () => boolean;
};

/**
 * Refuse *write* host CLI access to a sqlite file that another process
 * (typically the Docker Desktop bind-mounted api) already has open —
 * concurrent WAL writers on that mount corrupt the DB. Read-only opens are
 * allowed (use `readonly` + skip migrations on connect).
 */
export function assertCliMayOpenDb(
  dbPath: string | true,
  access: CliDbAccess = "write",
  deps: AssertCliMayOpenDbDeps = {},
): void {
  if (access === "read") return;
  if (dbPath === true) return;
  if (!fs.existsSync(dbPath)) return;

  const listHolderPids = deps.listHolderPids ?? listSqliteHolderPids;
  const dockerApiRunning =
    deps.isDevSiteDockerApiRunning ?? isDevSiteDockerApiRunning;

  const holders = listHolderPids(dbPath);
  if (holders.length > 0) {
    throw new DbInUseError(
      dbPath,
      `already open by process(es) ${holders.join(", ")}`,
    );
  }

  if (isDaemonSharedDbPath(dbPath) && dockerApiRunning()) {
    throw new DbInUseError(
      dbPath,
      "daemon Docker api container is running (shared bind-mounted sqlite)",
    );
  }
}
