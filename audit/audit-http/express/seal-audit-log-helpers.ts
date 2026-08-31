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

type AuditSealResultWire =
  AuditResponseBody["sealAuditLog"][200]["audit_seal_result"];

/** Map internal camelCase {@link AuditSealResult} to OpenAPI snake_case wire. */
export function auditSealResultToJsonBody(
  result: AuditSealResult,
): AuditResponseBody["sealAuditLog"][200] {
  const wire: AuditSealResultWire = {
    status: result.status,
    duration_ms: result.durationMs,
    ...(result.reason !== undefined ? { reason: result.reason } : {}),
    ...(result.archive
      ? {
          archive: {
            filename: result.archive.filename,
            size_bytes: result.archive.sizeBytes,
            sha256_hex: result.archive.sha256Hex,
            archive_key: result.archive.archiveKey,
            row_count: result.archive.rowCount,
            head_hash: result.archive.headHash,
            tail_hash: result.archive.tailHash,
            first_ts: result.archive.firstTs,
            last_ts: result.archive.lastTs,
            ...(result.archive.branchCount !== undefined
              ? { branch_count: result.archive.branchCount }
              : {}),
          },
        }
      : {}),
  };
  return { audit_seal_result: wire };
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
