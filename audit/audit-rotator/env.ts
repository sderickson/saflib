import type { EnvEnvSchema } from "@saflib/env/env";
import type { NodeEnvSchema } from "@saflib/node/env";

/**
 * Environment for `@saflib/audit-rotator` seal helpers (product bindings may extend).
 */
export interface AuditRotatorEnvSchema extends EnvEnvSchema, NodeEnvSchema {
  AUDIT_LOCAL_RETENTION_DAYS?: string;
}

export const typedEnv = (globalThis.process
  ? process.env
  : {}) as unknown as AuditRotatorEnvSchema;
