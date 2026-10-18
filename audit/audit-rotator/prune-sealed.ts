import { readdir, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { getSafReporters } from "@saflib/node";

/**
 * Deletes sealed archive files older than `retentionDays` from `sealedDir`.
 */
export async function pruneSealedArchives(
  sealedDir: string,
  retentionDays: number,
): Promise<{ deleted: number; kept: number }> {
  const { log } = getSafReporters();
  if (!Number.isFinite(retentionDays) || retentionDays < 0) {
    return { deleted: 0, kept: 0 };
  }
  let entries: string[];
  try {
    entries = await readdir(sealedDir);
  } catch {
    return { deleted: 0, kept: 0 };
  }
  const cutoffMs = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  let deleted = 0;
  let kept = 0;
  for (const e of entries) {
    if (!e.endsWith(".sqlite.zst")) {
      continue;
    }
    const p = path.join(sealedDir, e);
    try {
      const s = await stat(p);
      if (s.mtimeMs < cutoffMs) {
        await unlink(p);
        deleted++;
        log.info(`audit-seal: pruned old sealed archive (${p})`);
      } else {
        kept++;
      }
    } catch (err) {
      log.warn(
        `audit-seal: failed to prune sealed archive (${p}): ${String(err)}`,
      );
    }
  }
  return { deleted, kept };
}
