import type { DbKey } from "@saflib/drizzle";
import { countByStatusJob, countDeadSinceJob, listRunningJobsJob } from "@saflib/jobs-db";
import { throwError } from "@saflib/utils";
import { STALL_GRACE_MS, TIMEOUT_CEILING_MS } from "./constants.ts";

/** Same shape as `@saflib/ops-http`'s `DigestTileProvider`. */
export interface JobsDigestTileProvider {
  key: string;
  label: string;
  tiles: (ctx: { since: Date }) => Promise<{
    key: string;
    group: "system";
    label: string;
    value: string;
    detail: string;
    tone: "ok" | "warn" | "bad";
  }>;
}

/**
 * Background jobs tile for the admin Overview: jobs that died (ran out of
 * retries) in the window, and running jobs whose heartbeat stopped longer
 * ago than any operation may run. Either needs action.
 */
export function jobsDigestTile(options: { getDbKey: () => DbKey; now?: () => Date }): JobsDigestTileProvider {
  return {
    key: "jobs",
    label: "Background jobs",
    async tiles({ since }) {
      const dbKey = options.getDbKey();
      const now = options.now?.() ?? new Date();
      const [dead, running, counts] = await Promise.all([
        throwError(countDeadSinceJob(dbKey, since)),
        throwError(listRunningJobsJob(dbKey)),
        throwError(countByStatusJob(dbKey)),
      ]);
      const cutoff = now.getTime() - (TIMEOUT_CEILING_MS + STALL_GRACE_MS);
      const stuck = running.filter((j) => j.heartbeat_at && j.heartbeat_at.getTime() < cutoff).length;
      const depth = Object.fromEntries(counts.map((r) => [r.status, r.count]));
      const queued = (depth.pending ?? 0) + (depth.retrying ?? 0);
      return {
        key: "jobs",
        group: "system",
        label: "Background jobs",
        value: `${dead} failed`,
        detail: `${stuck > 0 ? `${stuck} stuck` : "None stuck"} · ${queued} queued`,
        tone: dead > 0 || stuck > 0 ? "bad" : "ok",
      };
    },
  };
}
