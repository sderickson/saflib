import type { AuditEventDetails, AuditSource } from "./schemas/audit-event.ts";

/**
 * Strict-column payload used for hash-chain canonicalization (excludes `prev_hash` and
 * `row_hash`, which are not part of the chained content blob).
 */
export type AuditRowContent = {
  id: string;
  ts: number;
  schema_version: number;
  source: AuditSource;
  actor_user_id: string | null;
  on_behalf_of_user_id: string | null;
  auth_method: string | null;
  request_id: string | null;
  client_ip: string | null;
  event_type: string;
  resource_type: string | null;
  resource_id: string | null;
  outcome: string;
  git_commit_root: string;
  git_commit_saflib: string;
  env: string;
  details: AuditEventDetails | null;
};
