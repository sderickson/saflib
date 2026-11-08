import type { AuditMapEntry } from "@saflib/audit-http/express/audit-map";

/**
 * Per-route opt-in for audit logging in the base golden product.
 * Key format: `"${METHOD} ${route_pattern}"` — Express-style `:param` patterns.
 *
 * Add entries when shipping routes via `openapi/route` (see workflow guidance).
 */
export const baseAuditMap: Record<string, AuditMapEntry> = {
  "PUT /user-configs/mine": {
    eventType: "user_config.update",
    resourceType: "user_config",
  },
  "POST /user-configs/unsubscribe-marketing": {
    eventType: "user_config.marketing_unsubscribe",
    resourceType: "user_config",
  },
  // Ops tokens (@saflib/ops-spec): machine credentials for the ops API.
  "POST /admin/ops-tokens": {
    eventType: "ops_token.create",
    resourceType: "ops_token",
  },
  "POST /admin/ops-tokens/:id/revoke": {
    eventType: "ops_token.revoke",
    resourceType: "ops_token",
  },
  // A site admin reading persisted logs.
  "GET /admin/logs": {
    eventType: "admin.logs.read",
    resourceType: "logs",
  },
  // Ops API reads, attributed to the token (actor `ops_token:<id>`).
  // `GET /ops/health` is deliberately not audited: uptime checks poll it.
  "GET /ops/deploys": {
    eventType: "ops_api.deploys.read",
    resourceType: "ops_api",
  },
  "GET /ops/logs": {
    eventType: "ops_api.logs.read",
    resourceType: "ops_api",
  },
  "GET /ops/logs/templates": {
    eventType: "ops_api.log_templates.read",
    resourceType: "ops_api",
  },
  "GET /ops/digest": {
    eventType: "ops_api.digest.read",
    resourceType: "ops_api",
  },
  "GET /ops/issues": {
    eventType: "ops_api.issues.read",
    resourceType: "ops_api",
  },
  "GET /ops/issues/:id": {
    eventType: "ops_api.issue.read",
    resourceType: "issue",
  },
  "GET /ops/issues/:id/occurrences": {
    eventType: "ops_api.issue_occurrences.read",
    resourceType: "issue",
  },
  // Triage (ops:triage): the only writes an ops token can make.
  "POST /ops/issues/:id/resolve": {
    eventType: "ops_api.issue.resolve",
    resourceType: "issue",
  },
  "POST /ops/issues/:id/ignore": {
    eventType: "ops_api.issue.ignore",
    resourceType: "issue",
  },
  "POST /ops/issues/:id/reopen": {
    eventType: "ops_api.issue.reopen",
    resourceType: "issue",
  },
};
