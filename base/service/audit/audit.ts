import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { auditDb } from "@saflib/audit-db/instances";
import { createAuditRecorder } from "@saflib/audit-http/express/audit-recorder";
import { createAuditRouter } from "@saflib/audit-http/express/createAuditRouter";
import type { DbKey } from "@saflib/drizzle";
import { typedEnv } from "@saflib/env";
import {
  baseServiceStorage,
  type BaseServiceContext,
} from "@saflib/base-service-common/context";
import { baseAuditMap } from "./audit-map.ts";

/** Absolute path to the audit SQLite file under this package's `data/`. */
export function getBaseAuditSqlitePath(): string {
  return path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    "data",
    `audit-db-${typedEnv.DEPLOYMENT_NAME}.sqlite`,
  );
}

let auditDbKey: DbKey | undefined;

/** Opaque key for `@saflib/audit-db` (separate from the main app DB). */
export function getBaseAuditDbKey(): DbKey {
  if (!auditDbKey) {
    const sqlitePath = getBaseAuditSqlitePath();
    if (process.env.NODE_ENV !== "test") {
      fs.mkdirSync(path.dirname(sqlitePath), { recursive: true });
    }
    auditDbKey = auditDb.connect({ onDisk: sqlitePath });
  }
  return auditDbKey;
}

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
  return createAuditRouter({
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
