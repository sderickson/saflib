import type { Response } from "express";
import { getSafContext } from "@saflib/node";
import type { OpsCaller } from "../auth/ops-token-resolver.ts";
import type { OpsBoot, OpsToken } from "@saflib/ops-db";
import type {
  OpsBootResponse,
  OpsIssueOccurrenceResponse,
  OpsIssueResponse,
  OpsLogEntryResponse,
  OpsLogTemplateResponse,
  OpsTokenResponse,
} from "@saflib/ops-spec";
import type { LogEntry, TemplateWithWindowCount } from "@saflib/node-log-db";
import type { IssueGroup, IssueOccurrence } from "@saflib/errors-db";

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
    released_at: row.released_at?.toISOString() ?? null,
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

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export function mapIssue(g: IssueGroup & { window_count?: number }): OpsIssueResponse {
  return {
    id: g.id,
    fingerprint: g.fingerprint,
    level: g.level,
    kind: g.kind,
    service_name: g.service_name,
    operation_name: g.operation_name,
    first_seen: g.first_seen.toISOString(),
    last_seen: g.last_seen.toISOString(),
    count: g.count,
    window_count: g.window_count ?? 0,
    first_seen_version: g.first_seen_version,
    last_seen_version: g.last_seen_version,
    status: g.status,
    status_note: g.status_note,
    status_changed_at: iso(g.status_changed_at),
    status_changed_by: g.status_changed_by,
    resolved_in_version: g.resolved_in_version,
    ignored_until: iso(g.ignored_until),
    untrusted: { title: g.title },
  };
}

export function mapOccurrence(o: IssueOccurrence): OpsIssueOccurrenceResponse {
  return {
    id: o.id,
    ts: o.ts.toISOString(),
    request_id: o.request_id,
    version: o.version,
    untrusted: { message: o.message, stack: o.stack, fields: o.fields },
  };
}

/** A query param that may be repeated (`?a=x&a=y`) or comma-separated, as a list. */
export function queryList(value: unknown): string[] | undefined {
  if (value === undefined) return undefined;
  const items = (Array.isArray(value) ? value : [value]).flatMap((v) => String(v).split(","));
  const list = items.map((v) => v.trim()).filter(Boolean);
  return list.length > 0 ? list : undefined;
}

/**
 * Who made a change: `ops_token:<id>` for token callers, `user:<id>` for a
 * site admin's session (admin pages).
 */
export function callerActor(res: Response): string {
  const caller = res.locals.opsToken as OpsCaller | undefined;
  if (caller) return `ops_token:${caller.id}`;
  const userId = getSafContext().auth?.userId;
  return userId ? `user:${userId}` : "unknown";
}
