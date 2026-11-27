/** Same shape as `@saflib/audit-http`'s `AuditMapEntry` (ops doesn't depend on audit). */
export interface OpsAuditMapEntry {
  eventType: string;
  resourceType: string;
  machineOnly?: boolean;
}

const read = (eventType: string, resourceType = "ops_api"): OpsAuditMapEntry => ({
  eventType,
  resourceType,
  // The admin UI polls these with a session; agents' token reads are what matter.
  machineOnly: true,
});
const act = (eventType: string, resourceType = "ops_api"): OpsAuditMapEntry => ({ eventType, resourceType });

/**
 * Audit entries for the ops API, for a product's audit map
 * (`{ ...opsAuditMap, ...productEntries }`). Every change is recorded,
 * whoever makes it; reads are recorded when a token (an agent) makes them.
 * Not audited: `GET /ops/health` and `/ops/access` (polled), the signed
 * graph images (no caller to attribute), and Alertmanager's webhook.
 */
export const opsAuditMap: Record<string, OpsAuditMapEntry> = {
  // Tokens
  "POST /admin/ops-tokens": act("ops_token.create", "ops_token"),
  "POST /admin/ops-tokens/:id/revoke": act("ops_token.revoke", "ops_token"),
  "POST /ops/tokens/exchange": act("ops_token.exchange", "ops_token"),
  // Reads
  "GET /ops/digest": read("ops_api.digest.read"),
  "GET /ops/deploys": read("ops_api.deploys.read"),
  "GET /ops/audit": read("ops_api.audit.read"),
  "GET /ops/backups": read("ops_api.backups.read"),
  "GET /ops/dependencies": read("ops_api.dependencies.read"),
  "GET /ops/logs": read("ops_api.logs.read"),
  "GET /ops/logs/groups": read("ops_api.log_groups.read"),
  "GET /ops/logs/templates": read("ops_api.log_templates.read"),
  "GET /ops/diagnostics": read("ops_api.diagnostics.read"),
  "GET /ops/diagnostics/runs/:run_id": read("ops_api.diagnostic_run.read"),
  "GET /ops/diagnostics/metrics": read("ops_api.diagnostic_metrics.read"),
  "GET /ops/metrics/query": read("ops_api.metrics.query"),
  "GET /ops/metrics/query_range": read("ops_api.metrics.query_range"),
  "GET /ops/metrics/series": read("ops_api.metrics.series"),
  "POST /ops/metrics/graph-links": read("ops_api.metrics.graph_link"),
  "GET /ops/alerts": read("ops_api.alerts.read"),
  "GET /ops/issues": read("ops_api.issues.read"),
  "GET /ops/issues/:id": read("ops_api.issue.read", "issue"),
  "GET /ops/issues/:id/occurrences": read("ops_api.issue_occurrences.read", "issue"),
  // SQL over the logs DB: recorded for everyone (the SQL is in the request's log line).
  "POST /ops/logs/query": act("ops_api.logs.query"),
  // Changes
  "POST /ops/alerts/:id/ack": act("ops_api.alert.ack", "alert"),
  "POST /ops/alerts/:id/resolve": act("ops_api.alert.resolve", "alert"),
  "POST /ops/issues/:id/resolve": act("ops_api.issue.resolve", "issue"),
  "POST /ops/issues/:id/ignore": act("ops_api.issue.ignore", "issue"),
  "POST /ops/issues/:id/reopen": act("ops_api.issue.reopen", "issue"),
  "POST /ops/backups/run": act("ops_api.backups.run"),
  "POST /ops/backups/maintenance": act("ops_api.backups.maintenance"),
  "POST /ops/diagnostics/runs/:run_id/probes/:probe_id": act("ops_api.diagnostic_probe.run"),
  "POST /ops/diagnostics/clear": act("ops_api.diagnostics.clear"),
};
