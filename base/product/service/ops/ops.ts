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
} from "@saflib/ops-http";

export { isOpsApiRequest };

const dataDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "data");

const opsDbAccessor = createOnDiskDbKeyAccessor({
  packageUrl: import.meta.url,
  filePrefix: "ops-db",
  connect: opsDb.connect,
});

/** Opaque key for `@saflib/ops-db` (ops tokens), separate from the main app DB. */
export const getBaseOpsDbKey = opsDbAccessor.getDbKey;

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
  });
}
