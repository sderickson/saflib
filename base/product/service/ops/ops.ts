import path from "node:path";
import { fileURLToPath } from "node:url";
import { createOnDiskDbKeyAccessor } from "@saflib/drizzle";
import { addTransport } from "@saflib/node";
import {
  createRedactionIssueRecorder,
  currentVersion,
  issuesDb,
  startIssueRetention,
} from "@saflib/errors-db";
import { createErrorService, setErrorService } from "@saflib/errors-service";
import { createPersistentLogTransport, logsDb } from "@saflib/node-log-db";
import { opsDb } from "@saflib/ops-db";
import {
  createOpsRouter,
  diskCheck,
  isOpsApiRequest,
  type HealthCheck,
  adminEmailSender,
  startOpsNotifier,
  type EmailSenderLike,
  type DigestTileProvider,
  type DiagnosticProbe,
} from "@saflib/ops-http";
import type { BackupDatabase, OpsAuditSource, OpsBackupsConfig } from "@saflib/ops-http";
import { enablePreMigrationBackups } from "@saflib/ops-http";
import { createObjectStore } from "@saflib/object-store";
import { createGcsObjectStore } from "@saflib/vendors-gcs";

export { isOpsApiRequest };

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "data");

const opsDbAccessor = createOnDiskDbKeyAccessor({
  packageUrl: import.meta.url,
  filePrefix: "ops-db",
  connect: opsDb.connect,
});

/** Opaque key for `@saflib/ops-db` (ops tokens), separate from the main app DB. */
export const getBaseOpsDbKey = opsDbAccessor.getDbKey;

/**
 * Where backups go: the GCS bucket in `BACKUPS_GCS_BUCKET` (a bucket of its
 * own, not the product's blobs); in development, a folder on this package's
 * data volume. Elsewhere without a bucket: none (Status says so).
 */
export function baseBackupsConfig(databases: BackupDatabase[]): OpsBackupsConfig | undefined {
  const bucketName = process.env.BACKUPS_GCS_BUCKET?.trim();
  const ops: BackupDatabase = { name: "ops", path: () => opsDb.getDbPath(getBaseOpsDbKey()) ?? null };
  // Kratos's SQLite file, when its volume is mounted here.
  const kratosPath = process.env.KRATOS_SQLITE_PATH?.trim();
  const all = [...databases, ops, ...(kratosPath ? [{ name: "kratos", path: kratosPath }] : [])];
  if (bucketName) return { databases: all, store: createGcsObjectStore({ bucketName }), retentionDays: 14, preMigrationDir };
  if (process.env.DEPLOYMENT_NAME === "development") {
    return { databases: all, store: createObjectStore({ type: "disk", rootPath: path.join(dataDir, "backups") }), retentionDays: 14, preMigrationDir };
  }
  return undefined;
}

/** Where snapshots taken before migrations wait to be uploaded (the ops data volume). */
const preMigrationDir = path.join(dataDir, "pre-migration");

/**
 * Snapshot each database before migrations run on it (the backup schedule
 * uploads them as `pre-migration` backups). Call first thing at startup,
 * before any database connects.
 */
export function enableBasePreMigrationBackups() {
  return enablePreMigrationBackups(preMigrationDir);
}

/** Rate-limit counts (SQLite), on this package's data volume so blue/green share them. */
export const getBaseRateLimitDbPath = () =>
  path.join(dataDir, `rate-limit-${process.env.DEPLOYMENT_NAME ?? "development"}.sqlite`);

const logsDbAccessor = createOnDiskDbKeyAccessor({
  packageUrl: import.meta.url,
  filePrefix: "logs-db",
  connect: logsDb.connect,
});

/** Opaque key for `@saflib/node-log-db` (persisted, redacted logs). */
export const getBaseLogsDbKey = logsDbAccessor.getDbKey;

const issuesDbAccessor = createOnDiskDbKeyAccessor({
  packageUrl: import.meta.url,
  filePrefix: "issues-db",
  connect: issuesDb.connect,
});

/** Opaque key for `@saflib/errors-db` (grouped errors and warnings). */
export const getBaseIssuesDbKey = issuesDbAccessor.getDbKey;

/**
 * Record server errors/warnings and client/CSP reports as grouped issues
 * (`GET /ops/issues`). Call once at startup, before any other error
 * service is configured (e.g. `configureMockErrors`, which then no-ops).
 */
export function configureBaseIssues() {
  setErrorService(createErrorService({ type: "sqlite", getDbKey: getBaseIssuesDbKey }));
  startIssueRetention(getBaseIssuesDbKey);
}

/**
 * Persist this process's logs (redacted, searchable, retained 14 days / 512 MB)
 * for `GET /ops/logs`. Call once at startup, after `setServiceName`.
 */
export function enableBasePersistentLogs() {
  addTransport(
    createPersistentLogTransport({
      getDbKey: getBaseLogsDbKey,
      // A log call that leaks a secret or PII becomes a warn issue to fix.
      onRedaction: createRedactionIssueRecorder({
        getDbKey: getBaseIssuesDbKey,
        version: currentVersion(),
      }),
    }),
  );
}

export interface CreateBaseOpsRouterOptions {
  /** Checks beyond the defaults (process, and disk for this package's data volume). */
  healthChecks?: HealthCheck[];
  /** Overview tiles beyond the ops API's own (jobs, cron, audit, product queues). */
  digestTiles?: DigestTileProvider[];
  /** Self-test probes beyond the ops API's own (failing job, audit event). */
  diagnosticProbes?: DiagnosticProbe[];
  /** The databases to back up (ops and Kratos are added); see {@link baseBackupsConfig}. */
  backupDatabases?: BackupDatabase[];
  /** The audit log for `GET /ops/audit` (`opsAuditSource` from audit-http). */
  audit?: OpsAuditSource;
}

/**
 * The ops API (`/ops/*`, by ops token) and token admin (`/admin/ops-tokens`,
 * site admin) for the base product. Mount with the platform routers, and pass
 * {@link isOpsApiRequest} as `deferAuth` so the session gate lets ops calls
 * through to their own security.
 */
export function createBaseOpsRouter(options: CreateBaseOpsRouterOptions = {}) {
  return createOpsRouter({
    dbKey: getBaseOpsDbKey(),
    logsDbKey: getBaseLogsDbKey(),
    issuesDbKey: getBaseIssuesDbKey(),
    healthChecks: [diskCheck({ path: dataDir }), ...(options.healthChecks ?? [])],
    // PromQL via the host's prom-label-proxy, confined to saf_app="base"
    // (set by this app's scrape config) plus host metrics.
    metrics: { app: "base" },
    digestTiles: options.digestTiles,
    diagnosticProbes: options.diagnosticProbes,
    audit: options.audit,
    backups: options.backupDatabases ? baseBackupsConfig(options.backupDatabases) : undefined,
  });
}

/**
 * Email every site admin (`ADMIN_EMAILS`) about newly firing alerts and new
 * error issues: batched every 5 minutes, at most one email per 15 minutes
 * and 12 a day. Call once at startup, after email is configured.
 */
export function startBaseOpsNotifier(email: EmailSenderLike, from: string) {
  return startOpsNotifier({
    product: "base",
    dbKey: getBaseOpsDbKey(),
    issuesDbKey: getBaseIssuesDbKey(),
    send: adminEmailSender(email, from),
  });
}
