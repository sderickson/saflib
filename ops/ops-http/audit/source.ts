import type { OpsAuditEvent } from "@saflib/ops-spec";

/**
 * Where `GET /ops/audit` reads from. The audit package provides one
 * (`opsAuditSource` in `@saflib/audit-http`); ops doesn't depend on audit.
 * Throw an error with `status: 400` for a bad cursor.
 */
export interface OpsAuditSource {
  list(params: {
    userId?: string;
    eventPrefix?: string;
    since?: Date;
    limit: number;
    cursor?: string;
  }): Promise<{ events: OpsAuditEvent[]; nextCursor: string | null }>;
}
