import type { DbKey } from "@saflib/drizzle";
import type { HealthCheck } from "@saflib/node";
import { countByStatusJob, countDeadSinceJob } from "@saflib/jobs-db";
import { throwError } from "@saflib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * `jobs`: warns when any job went dead (exhausted its retries) in the last
 * 24h, and reports queue depth by status.
 */
export function createJobsHealthCheck(options: { getDbKey: () => DbKey }): HealthCheck {
  return {
    name: "jobs",
    async run() {
      const dbKey = options.getDbKey();
      const [deadCount, counts] = await Promise.all([
        throwError(countDeadSinceJob(dbKey, new Date(Date.now() - DAY_MS))),
        throwError(countByStatusJob(dbKey)),
      ]);
      const depth = Object.fromEntries(counts.map((r) => [r.status, r.count]));
      const backlog = (depth.pending ?? 0) + (depth.retrying ?? 0);
      return {
        status: deadCount > 0 ? "warn" : "ok",
        summary:
          deadCount > 0
            ? `${deadCount} job(s) went dead in the last 24h`
            : `no dead jobs in 24h; ${backlog} queued`,
        observed: {
          dead_last_24h: deadCount,
          pending: depth.pending ?? 0,
          retrying: depth.retrying ?? 0,
          running: depth.running ?? 0,
        },
      };
    },
  };
}
