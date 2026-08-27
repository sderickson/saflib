import { auditDb } from "@saflib/audit-db/instances";
import { createAuditRecorder } from "@saflib/audit-http/express/audit-recorder";
import { createAuditLogsRouter } from "@saflib/audit-http/express/createAuditLogsRouter";
import { createOnDiskDbKeyAccessor, type DbKey } from "@saflib/drizzle";
import {
  baseServiceStorage,
  type BaseServiceContext,
} from "@saflib/base-service-common/context";
import { baseAuditMap } from "./audit-map.ts";

const auditDbAccessor = createOnDiskDbKeyAccessor({
  packageUrl: import.meta.url,
  filePrefix: "audit-db",
  connect: auditDb.connect,
});

/** Absolute path to the audit SQLite file under this package's `data/`. */
export const getBaseAuditSqlitePath = auditDbAccessor.getSqlitePath;

/** Opaque key for `@saflib/audit-db` (separate from the main app DB). */
export const getBaseAuditDbKey = auditDbAccessor.getDbKey;

function resolveAuditDbKeyFromContext(): DbKey | undefined {
  return baseServiceStorage.getStore()?.auditDbKey;
}

export const baseAuditRecorder = createAuditRecorder({
  getAuditDbKey: resolveAuditDbKeyFromContext,
  auditMap: baseAuditMap,
});

export function baseAuditRecorderMiddleware() {
  return baseAuditRecorder.middleware();
}

export function appendFailClosedBaseHttpAuditIfRequired(
  ...args: Parameters<
    typeof baseAuditRecorder.appendFailClosedHttpAuditIfRequired
  >
) {
  return baseAuditRecorder.appendFailClosedHttpAuditIfRequired(...args);
}

export function createBaseAuditRouter() {
  return createAuditLogsRouter({
    getAuditDbKey: () => {
      const fromContext = resolveAuditDbKeyFromContext();
      return fromContext ?? getBaseAuditDbKey();
    },
  });
}

export function connectBaseAuditDb(
  context: BaseServiceContext,
): BaseServiceContext {
  return {
    ...context,
    auditDbKey: getBaseAuditDbKey(),
  };
}

export { baseAuditMap } from "./audit-map.ts";
