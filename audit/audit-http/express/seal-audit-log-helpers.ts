import type { AuditSealResult } from "@saflib/audit-db/seal-types";
import type { AuditResponseBody } from "@saflib/audit-spec/types";
import {
  AuditChainCorruptError,
  AuditSealConfigError,
  AuditSealInMemoryDbError,
  AuditSealShipError,
  AuditSealEmailError,
  AuditSealUploadError,
} from "@saflib/audit-db/seal-errors";

export function auditSealResultToJsonBody(
  result: AuditSealResult,
): AuditResponseBody["sealAuditLog"][200] {
  return { auditSealResult: result };
}

export function mapSealPipelineErrorTo500(
  err: unknown,
): AuditResponseBody["sealAuditLog"][500] {
  const message =
    err instanceof Error ? err.message : "An unexpected error occurred";

  if (err instanceof AuditChainCorruptError) {
    return { error: { code: "audit_chain_corrupt", message } };
  }
  if (
    err instanceof AuditSealShipError ||
    err instanceof AuditSealUploadError ||
    err instanceof AuditSealEmailError
  ) {
    const code =
      err instanceof AuditSealEmailError
        ? "audit_email_failed"
        : err instanceof AuditSealUploadError
          ? "audit_upload_failed"
          : "audit_ship_failed";
    return { error: { code, message } };
  }
  if (
    err instanceof AuditSealConfigError ||
    err instanceof AuditSealInMemoryDbError
  ) {
    return { error: { code: "audit_unknown", message } };
  }

  return { error: { code: "audit_unknown", message } };
}
