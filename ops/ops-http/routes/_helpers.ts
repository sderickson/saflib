import type { OpsBoot, OpsToken } from "@saflib/ops-db";
import type {
  OpsBootResponse,
  OpsLogEntryResponse,
  OpsLogTemplateResponse,
  OpsTokenResponse,
} from "@saflib/ops-spec";
import type { LogEntry, TemplateWithWindowCount } from "@saflib/node-log-db";

/** DB row → API shape. Never includes the hash. */
export function mapOpsToken(row: OpsToken): OpsTokenResponse {
  return {
    id: row.id,
    name: row.name,
    token_prefix: row.token_prefix,
    scopes: row.scopes,
    created_by: row.created_by,
    created_at: row.created_at.toISOString(),
    expires_at: row.expires_at?.toISOString() ?? null,
    last_used_at: row.last_used_at?.toISOString() ?? null,
    revoked_at: row.revoked_at?.toISOString() ?? null,
  };
}

/** DB row → API shape. */
export function mapOpsBoot(row: OpsBoot): OpsBootResponse {
  return {
    ...row,
    started_at: row.started_at.toISOString(),
    built_at: row.built_at?.toISOString() ?? null,
  };
}

/** A query param as a non-empty string, or undefined. */
export function queryString(value: unknown): string | undefined {
  return typeof value === "string" && value !== "" ? value : undefined;
}

/** A query param (already validated as date-time) as a Date. */
export function queryDate(value: unknown): Date | undefined {
  if (value instanceof Date) return value;
  const s = queryString(value);
  return s ? new Date(s) : undefined;
}

/** Free text goes under `untrusted`: it can contain outside content. */
export function mapLogEntry(e: LogEntry): OpsLogEntryResponse {
  return {
    id: e.id,
    ts: e.ts.toISOString(),
    level: e.level,
    service_name: e.service_name,
    subsystem_name: e.subsystem_name,
    operation_name: e.operation_name,
    request_id: e.request_id,
    user_id: e.user_id,
    template_hash: e.template_hash,
    redactions: e.redactions,
    untrusted: { message: e.message, fields: e.fields },
  };
}

export function mapLogTemplate(t: TemplateWithWindowCount): OpsLogTemplateResponse {
  return {
    hash: t.hash,
    level: t.level,
    service_name: t.service_name,
    first_seen: t.first_seen.toISOString(),
    last_seen: t.last_seen.toISOString(),
    count: t.count,
    window_count: t.window_count,
    untrusted: { template: t.template, sample_message: t.sample_message },
  };
}
