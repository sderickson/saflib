import type { ResponseBody as checkAuditLogRotationMaintenanceResponseBody } from "@saflib/audit-spec/operations/checkAuditLogRotationMaintenance";
import type { ResponseBody as sealAuditLogMaintenanceResponseBody } from "@saflib/audit-spec/operations/sealAuditLogMaintenance";
import type { AuditRotationStatus } from "@saflib/audit-spec/schemas/AuditRotationStatus";
import type { AuditSealResult } from "@saflib/audit-db/seal-types";

export function mapAuditSealResult(
  result: AuditSealResult,
): sealAuditLogMaintenanceResponseBody["sealAuditLogMaintenance"][200] {
  return { audit_seal_result: result };
}

export function mapAuditRotationStatus(
  status: Omit<AuditRotationStatus, "healthy">,
): checkAuditLogRotationMaintenanceResponseBody["checkAuditLogRotationMaintenance"][200] {
  return {
    auditRotationStatus: {
      healthy: true,
      empty: status.empty,
      earliest_at: status.earliest_at,
      age_ms: status.age_ms,
      threshold_ms: status.threshold_ms,
    },
  };
}
