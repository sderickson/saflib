import { createHash } from "node:crypto";
import { Readable } from "node:stream";
import type { EmailService } from "@saflib/email-service";
import type { ObjectStore } from "@saflib/object-store";
import type { ShipSealedArchiveContext } from "@saflib/audit-db/seal-types";
import {
  AuditSealEmailError,
  AuditSealUploadError,
} from "@saflib/audit-db/seal-errors";
import { getSafReporters } from "@saflib/node";
import { getGitHashes } from "@saflib/node/git-hashes";
import { sendAuditDigestEmail } from "./digest-email.ts";
import { readLastDigest, writeLastDigest } from "./last-digest.ts";
import type { ShipSealedArchiveFn } from "./seal-and-ship.ts";

export type ObjectStoreShipOptions = {
  /** Where sealed archives are uploaded. */
  objectStore: ObjectStore;
  /** Audit data root; the last digest sent is recorded here. */
  dataRoot: string;
  /**
   * Read the object back and compare its SHA-256 after upload (default true).
   * Turn off only for stores that don't round-trip bytes, such as a GCS stub.
   */
  verifyUpload?: boolean;
  /**
   * Digest email for each sealed window. Without a `recipient` no email is
   * sent and no digest is recorded.
   */
  digest: {
    recipient?: string;
    from: string;
    serviceName: string;
    environment: string;
    emailService: EmailService;
  };
};

async function sha256Stream(stream: Readable): Promise<string> {
  const hash = createHash("sha256");
  for await (const chunk of stream) {
    hash.update(chunk as Buffer);
  }
  return hash.digest("hex");
}

/**
 * Ship callback for {@link sealAndShipAuditDb}: uploads the sealed archive to
 * an object store, verifies it, emails a digest, and records that digest so
 * the next one can chain to it.
 */
export function createObjectStoreShipSealedArchive(
  options: ObjectStoreShipOptions,
): ShipSealedArchiveFn {
  return async ({ artifact, trigger }: ShipSealedArchiveContext) => {
    const { log } = getSafReporters();
    const { objectStore, dataRoot, digest } = options;
    const archiveKey = artifact.suggested_archive_key;

    log.info(`audit-seal: upload ${archiveKey}`);
    const uploadRes = await objectStore.uploadFile(
      archiveKey,
      Readable.from(artifact.compressed),
      {
        mimetype: "application/zstd",
        filename: artifact.filename,
        sha256: artifact.sha256_hex,
      },
    );
    if (uploadRes.error) {
      throw new AuditSealUploadError(uploadRes.error.message, uploadRes.error);
    }

    if (options.verifyUpload === false) {
      log.info("audit-seal: skip remote checksum verify");
    } else {
      log.info("audit-seal: verify uploaded object checksum");
      const readBack = await objectStore.readFile(archiveKey);
      if (readBack.error) {
        throw new AuditSealUploadError(
          `read back after upload: ${readBack.error.message}`,
          readBack.error,
        );
      }
      const remoteSha = await sha256Stream(readBack.result);
      if (remoteSha !== artifact.sha256_hex) {
        throw new AuditSealUploadError(
          `upload checksum mismatch: local ${artifact.sha256_hex} remote ${remoteSha}`,
        );
      }
    }

    const recipient = digest.recipient?.trim();
    if (!recipient) {
      log.info(
        "audit-seal: skip email (no digest recipient); digest not persisted",
      );
      return { archive_key: archiveKey };
    }

    const gitHashes = getGitHashes();
    const previous = await readLastDigest(dataRoot);
    log.info(
      `audit-seal: send digest email (trigger=${trigger.kind}` +
        (trigger.kind === "admin" ? ` user=${trigger.userId})` : ")"),
    );
    try {
      await sendAuditDigestEmail({
        emailService: digest.emailService,
        from: digest.from,
        to: recipient,
        digest: {
          filename: artifact.filename,
          sha256Hex: artifact.sha256_hex,
          rowCount: artifact.row_count,
          firstTs: artifact.first_ts,
          lastTs: artifact.last_ts,
          headHash: artifact.head_hash,
          tailHash: artifact.tail_hash,
          branchCount: artifact.branch_count,
          archiveKey,
          environment: digest.environment,
          serviceName: digest.serviceName,
          trigger: trigger.kind === "admin" ? "admin" : "cron",
          triggeredByUserId:
            trigger.kind === "admin" ? trigger.userId : undefined,
          gitCommitRoot: gitHashes.root,
          gitCommitSaflib: gitHashes.saflib,
          previous:
            previous != null
              ? {
                  archiveKey: previous.archiveKey,
                  chainTailHash: previous.chainTailHash,
                  sentAt: previous.sentAt,
                }
              : undefined,
        },
      });
    } catch (e) {
      throw new AuditSealEmailError(
        e instanceof Error ? e.message : String(e),
        e,
      );
    }

    await writeLastDigest(dataRoot, {
      archiveKey,
      filename: artifact.filename,
      archiveSha256Hex: artifact.sha256_hex,
      chainTailHash: artifact.tail_hash,
      sentAt: new Date().toISOString(),
    });
    return { archive_key: archiveKey };
  };
}
