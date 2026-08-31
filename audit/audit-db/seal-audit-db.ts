import { createHash } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import lockfile from "proper-lockfile";
import { auditDb } from "./instances.ts";
import { withAuditWriteLock } from "./audit-write-lock.ts";
import { clearAuditEventsForRotation } from "./queries/audit-event/clear-for-rotation.ts";
import { getAuditEventTimestampBounds } from "./queries/audit-event/timestamp-bounds.ts";
import { verifyAuditChain } from "./queries/audit-event/verify-chain.ts";
import type { VerifyAuditChainSuccess } from "./queries/audit-event/verify-chain.ts";
import type { DbKey } from "@saflib/drizzle";
import { getSafReporters } from "@saflib/node";
import { compress } from "./zstd.ts";
import {
  AuditChainCorruptError,
  AuditSealInMemoryDbError,
} from "./seal-errors.ts";
import { isoSafe } from "./iso-safe.ts";
import { pruneSealedArchives } from "./prune-sealed.ts";
import type {
  AuditSealArtifact,
  AuditSealResult,
  AuditSealTrigger,
  SealAuditDbOptions,
} from "./seal-types.ts";

export type { AuditSealResult, AuditSealTrigger, SealAuditDbOptions } from "./seal-types.ts";
export type {
  AuditSealArtifact,
  ShipSealedArchiveCallback,
  ShipSealedArchiveContext,
} from "./seal-types.ts";

function suggestedArchiveKey(firstTs: Date, filename: string): string {
  const y = firstTs.getUTCFullYear();
  const m = String(firstTs.getUTCMonth() + 1).padStart(2, "0");
  const d = String(firstTs.getUTCDate()).padStart(2, "0");
  return `audit/${y}/${m}/${d}/${filename}`;
}

/**
 * Seal the active audit DB: verify chain, snapshot, compress, then delegate
 * upload + off-system seal reporting to {@link SealAuditDbOptions.shipSealedArchive}.
 * Clears the active store only after ship succeeds.
 */
export async function sealAuditDb(
  trigger: AuditSealTrigger,
  options: SealAuditDbOptions,
): Promise<AuditSealResult> {
  const started = Date.now();
  const { log } = getSafReporters();
  const finish = (
    partial: Omit<AuditSealResult, "durationMs">,
  ): AuditSealResult => ({
    ...partial,
    durationMs: Date.now() - started,
  });

  const dataRoot = options.dataRoot;
  await mkdir(dataRoot, { recursive: true });
  const stagingDir = path.join(dataRoot, "staging");
  const sealedDir = path.join(dataRoot, "sealed");
  await mkdir(stagingDir, { recursive: true });
  await mkdir(sealedDir, { recursive: true });

  const lockPath = path.join(dataRoot, ".seal.lock");
  let releaseLock: (() => Promise<void>) | undefined;

  try {
    try {
      releaseLock = await lockfile.lock(lockPath, {
        retries: 0,
        realpath: false,
      });
    } catch {
      log.info("audit-seal: lock busy, skipping (in_progress)");
      return finish({ status: "skipped", reason: "in_progress" });
    }

    await options.assertSealConfigured?.();

    const dbKey = options.auditDbKey;

    log.info("audit-seal: quick-check row count");
    const boundsPacked = await getAuditEventTimestampBounds(dbKey);
    if (boundsPacked.error) {
      throw new Error("getAuditEventTimestampBounds: unexpected error branch");
    }
    const { headAt, tailAt } = boundsPacked.result;
    if (headAt == null || tailAt == null) {
      log.info("audit-seal: empty active DB, skipping");
      return finish({ status: "skipped", reason: "empty" });
    }

    const activePath = auditDb.getDbPath(dbKey);
    if (!activePath || activePath === ":memory:") {
      throw new AuditSealInMemoryDbError();
    }

    log.info("audit-seal: verify chain on active DB");
    await withAuditWriteLock(dbKey, async () => {
      await assertChainValid(dbKey, "active");
    });

    const finalFilename = `audit-${isoSafe(headAt)}.sqlite.zst`;
    const stagingSnapshot = path.join(
      stagingDir,
      finalFilename.replace(/\.zst$/, ""),
    );
    const stagingZst = path.join(stagingDir, finalFilename);
    const sealedPath = path.join(sealedDir, finalFilename);

    const cleanupStagingFiles = async () => {
      await unlink(stagingSnapshot).catch(() => undefined);
      await unlink(stagingZst).catch(() => undefined);
    };

    let chainStaging: Extract<
      VerifyAuditChainSuccess,
      { headHash: string }
    >;
    let sha256Hex: string;
    let compressed: Buffer;

    try {
      log.info(`audit-seal: online backup to ${stagingSnapshot}`);
      await withAuditWriteLock(dbKey, async () => {
        await auditDb.backupTo(dbKey, stagingSnapshot);
      });

      log.info("audit-seal: verify staging snapshot");
      let stagingKey: DbKey;
      try {
        stagingKey = auditDb.connect({
          onDisk: stagingSnapshot,
          overrideTestDefault: true,
          skipMigrations: true,
        });
      } catch (e) {
        throw new AuditChainCorruptError(
          "staging",
          "snapshot_open_failed",
          e instanceof Error ? e.message : String(e),
        );
      }
      try {
        chainStaging = await assertChainValid(stagingKey, "staging");
      } finally {
        auditDb.disconnect(stagingKey);
      }

      log.info("audit-seal: compress with zstd level 19");
      const uncompressed = await readFile(stagingSnapshot);
      compressed = await compress(uncompressed, 19);
      sha256Hex = createHash("sha256").update(compressed).digest("hex");
      await writeFileAtomic(stagingZst, compressed);

      try {
        await unlink(stagingSnapshot);
      } catch {
        /* ignore */
      }

      const artifact: AuditSealArtifact = {
        filename: finalFilename,
        localPath: stagingZst,
        compressed,
        sha256Hex,
        rowCount: chainStaging.rowCount,
        headHash: chainStaging.headHash,
        tailHash: chainStaging.tailHash,
        branchCount: chainStaging.branchCount,
        firstTs: headAt.toISOString(),
        lastTs: tailAt.toISOString(),
        suggestedArchiveKey: suggestedArchiveKey(headAt, finalFilename),
      };

      log.info("audit-seal: ship sealed archive (host callback)");
      const { archiveKey } = await options.shipSealedArchive({
        artifact,
        trigger,
      });

      log.info(`audit-seal: rename to sealed (${sealedPath})`);
      await rename(stagingZst, sealedPath);

      log.info("audit-seal: clear active audit rows + VACUUM");
      const cleared = await clearAuditEventsForRotation(dbKey);
      if (!cleared.result) {
        throw new Error("clearAuditEventsForRotation: no result");
      }
      log.info(`audit-seal: cleared ${cleared.result.deletedRows} rows`);

      const retentionDays = options.localRetentionDays ?? 7;
      await pruneSealedArchives(sealedDir, retentionDays);

      log.info("audit-seal: complete");
      return finish({
        status: "sealed",
        archive: {
          filename: finalFilename,
          sizeBytes: compressed.length,
          sha256Hex,
          archiveKey,
          rowCount: chainStaging.rowCount,
          headHash: chainStaging.headHash,
          tailHash: chainStaging.tailHash,
          branchCount: chainStaging.branchCount,
          firstTs: headAt.toISOString(),
          lastTs: tailAt.toISOString(),
        },
      });
    } catch (err) {
      await cleanupStagingFiles();
      throw err;
    }
  } finally {
    if (releaseLock) {
      await releaseLock();
    }
  }
}

async function assertChainValid(
  dbKey: DbKey,
  phase: string,
): Promise<Extract<VerifyAuditChainSuccess, { headHash: string }>> {
  const packed = await verifyAuditChain(dbKey, {});
  if (packed.error) {
    throw new AuditChainCorruptError(
      phase,
      "verify_error",
      packed.error.message,
    );
  }
  const res = packed.result;
  if (!res.valid) {
    throw new AuditChainCorruptError(
      phase,
      res.reason,
      `firstBadIndex=${res.firstBadIndex} firstBadId=${res.firstBadId}`,
    );
  }
  if (res.rowCount === 0 || res.headHash === null || res.tailHash === null) {
    throw new AuditChainCorruptError(
      phase,
      "unexpected_empty_chain",
      "verify returned no rows after nonempty bounds",
    );
  }
  if (res.branchCount > 0) {
    getSafReporters().log.warn(
      `audit-seal: chain has ${res.branchCount} branch row(s) in ${phase} (${phase} verify still passed)`,
    );
  }
  return res;
}

async function writeFileAtomic(dest: string, data: Buffer): Promise<void> {
  const tmp = `${dest}.tmp.${process.pid}`;
  await writeFile(tmp, data);
  await rename(tmp, dest);
}
