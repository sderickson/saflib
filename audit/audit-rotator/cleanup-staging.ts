import { readdir, unlink } from "node:fs/promises";
import path from "node:path";
import { getSafReporters } from "@saflib/node";

/**
 * Removes any leftover files in `<dataRoot>/staging/`. They can only appear
 * if a previous seal crashed mid-flight; the canonical data still lives in
 * the active audit DB and will be re-sealed on the next run.
 */
export async function cleanupOrphanedSealStaging(
  dataRoot: string,
): Promise<void> {
  const stagingDir = path.join(dataRoot, "staging");
  const { log } = getSafReporters();
  let entries: string[];
  try {
    entries = await readdir(stagingDir);
  } catch {
    return;
  }
  for (const e of entries) {
    if (e === ".seal.lock") {
      continue;
    }
    const p = path.join(stagingDir, e);
    try {
      await unlink(p);
      log.warn(
        `audit-seal: removed orphaned staging file from previous run (${p})`,
      );
    } catch (err) {
      log.warn(
        `audit-seal: failed to remove orphaned staging file (${p}): ${String(err)}`,
      );
    }
  }
}
