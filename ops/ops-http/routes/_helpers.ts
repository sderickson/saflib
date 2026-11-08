import type { OpsToken } from "@saflib/ops-db";
import type { OpsTokenResponse } from "@saflib/ops-spec";

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
