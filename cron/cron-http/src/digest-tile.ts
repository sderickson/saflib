import type { DbKey } from "@saflib/drizzle";
import { getAll } from "@saflib/cron-db";
import { throwError } from "@saflib/utils";
import { CronTime } from "cron";
import type { JobsMap } from "./types.ts";

/** A run this much past its slot counts as late. */
export const CRON_LATE_GRACE_MS = 10 * 60_000;

/** Same shape as `@saflib/ops-http`'s `DigestTileProvider`. */
export interface CronDigestTileProvider {
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

/** When the run after `lastRun` was due, per the schedule. */
export function nextDueAfter(schedule: string, lastRun: Date): Date | null {
  try {
    return new CronTime(schedule).getNextDateFrom(lastRun).toJSDate();
  } catch {
    return null;
  }
}

/**
 * Cron jobs tile for the admin Overview: enabled jobs whose last run failed
 * need action (red); ones that missed their slot are worth a look (yellow)
 * where the server is meant to be up around the clock (production by
 * default; a laptop's dev stack sleeps through nightly slots). Disabled
 * jobs are a choice, not a problem.
 */
export function cronDigestTile(options: {
  getDbKey: () => DbKey;
  jobs: JobsMap;
  now?: () => Date;
  /** Count missed slots as late. Default: DEPLOYMENT_NAME is "production". */
  expectSchedule?: boolean;
}): CronDigestTileProvider {
  const expectSchedule = options.expectSchedule ?? process.env.DEPLOYMENT_NAME === "production";
  return {
    key: "cron",
    label: "Cron jobs",
    async tiles() {
      const now = (options.now?.() ?? new Date()).getTime();
      const settings = await throwError(getAll(options.getDbKey()));
      const known = settings.filter((s) => s.job_name in options.jobs);
      const enabled = known.filter((s) => s.enabled);
      const failed = enabled.filter((s) => s.last_run_status === "fail" || s.last_run_status === "timed out").length;
      const late = enabled.filter((s) => {
        if (!expectSchedule || !s.last_run_at) return false;
        const due = nextDueAfter(options.jobs[s.job_name]!.schedule, s.last_run_at);
        return due !== null && due.getTime() + CRON_LATE_GRACE_MS < now;
      }).length;
      const problems = [failed && `${failed} failed`, late && `${late} late`].filter(Boolean).join(" · ");
      return {
        key: "cron",
        group: "system",
        label: "Cron jobs",
        value: problems || `${enabled.length} on schedule`,
        detail: problems ? `${enabled.length} enabled` : "",
        tone: failed ? "bad" : late ? "warn" : "ok",
      };
    },
  };
}
