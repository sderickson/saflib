import type { AuditMapEntry } from "@saflib/audit-http";

/**
 * Per-route opt-in for audit logging in the base golden product.
 * Key format: "${METHOD} ${route_pattern}" — Express-style `:param` patterns.
 */
export const baseAuditMap: Record<string, AuditMapEntry> = {
  "PUT /user-configs/mine": {
    eventType: "user_config.update",
    resourceType: "user_config",
    failClosed: true,
  },
  "POST /admin/test-error": {
    eventType: "admin.test_error",
    resourceType: "admin",
  },
  "POST /jobs/:id/retry": {
    eventType: "job.retry",
    resourceType: "job",
  },
  "POST /jobs/:id/cancel": {
    eventType: "job.cancel",
    resourceType: "job",
  },
  "POST /jobs/cancel-by-original-request": {
    eventType: "job.cancel_by_original_request",
    resourceType: "job",
  },
};
