import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { typedEnv } from "@saflib/env";
import type { DbKey, DbOptions } from "./types.ts";

export type CreateOnDiskDbKeyAccessorOptions = {
  /** Calling module's `import.meta.url` (or any file URL under the package). */
  packageUrl: string;
  /**
   * Filename stem before `-${DEPLOYMENT_NAME}.sqlite`
   * (e.g. `"cron-db"` → `cron-db-development.sqlite`).
   */
  filePrefix: string;
  /** `DbManager.connect` (or compatible) from the owning DB package. */
  connect: (options?: DbOptions) => DbKey;
  /**
   * Absolute data directory. Defaults to `<dirname(packageUrl)>/data`.
   * Use a function when the root can change (tests / seal data mounts).
   */
  dataDir?: string | (() => string);
};

/**
 * Absolute SQLite path for a package-owned on-disk DB file.
 *
 * Prefer {@link createOnDiskDbKeyAccessor} when you also need a lazy `DbKey`.
 */
export function packageSqlitePath(
  packageUrl: string,
  filePrefix: string,
  dataDir?: string | (() => string),
): string {
  const resolvedDataDir =
    typeof dataDir === "function"
      ? dataDir()
      : (dataDir ??
        path.join(path.dirname(fileURLToPath(packageUrl)), "data"));
  return path.join(
    resolvedDataDir,
    `${filePrefix}-${typedEnv.DEPLOYMENT_NAME}.sqlite`,
  );
}

/**
 * Lazy singleton for package-owned SQLite files (`cron-db`, `jobs-db`, `audit-db`, …).
 *
 * Creates the parent `data/` directory outside tests, then calls `connect({ onDisk })`.
 */
export function createOnDiskDbKeyAccessor(
  options: CreateOnDiskDbKeyAccessorOptions,
): {
  getSqlitePath: () => string;
  getDbKey: () => DbKey;
} {
  let dbKey: DbKey | undefined;

  const getSqlitePath = () =>
    packageSqlitePath(options.packageUrl, options.filePrefix, options.dataDir);

  const getDbKey = () => {
    if (!dbKey) {
      const sqlitePath = getSqlitePath();
      if (process.env.NODE_ENV !== "test") {
        fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
      }
      dbKey = options.connect({ onDisk: sqlitePath });
    }
    return dbKey;
  };

  return { getSqlitePath, getDbKey };
}
