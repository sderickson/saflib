import path from "node:path";
import { fileURLToPath } from "node:url";
import { typedEnv } from "@saflib/env";

const packageDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Directory for seal pipeline filesystem state: `.seal.lock`, `staging/`, `sealed/`,
 * `last-digest.json`, etc. Production uses the package `data/` folder, which Docker mounts at
 * `/app/daemon/service/audit-db/data` alongside the live SQLite file.
 *
 * In tests, set `AUDIT_DATA_ROOT` to isolate seal artifacts under a temp directory (the live DB
 * file path is controlled separately via `auditDb.connect`).
 */
export function auditDbDataRoot(): string {
  if (process.env.NODE_ENV === "test") {
    const raw = process.env.AUDIT_DATA_ROOT?.trim();
    if (raw) {
      return path.resolve(raw);
    }
  }
  return path.join(packageDir, "data");
}

/**
 * Default on-disk path for the active audit SQLite database — identical to
 * `auditDb.connect({ onDisk: true })`.
 */
export function defaultAuditDbSqlitePath(): string {
  return path.join(packageDir, "data", `db-${typedEnv.DEPLOYMENT_NAME}.sqlite`);
}
