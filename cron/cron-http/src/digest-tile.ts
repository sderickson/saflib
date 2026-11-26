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
 * or that missed their slot need action; disabled ones are noted.
 */
export function cronDigestTile(options: {
  getDbKey: () => DbKey;
  jobs: JobsMap;
  now?: () => Date;
}): CronDigestTileProvider {
  return {
    key: "cron",
    label: "Cron jobs",
    async tiles() {
      const now = (options.now?.() ?? new Date()).getTime();
      const settings = await throwError(getAll(options.getDbKey()));
      const known = settings.filter((s) => s.job_name in options.jobs);
      const enabled = known.filter((s) => s.enabled);
      const disabled = known.length - enabled.length;
      const failed = enabled.filter((s) => s.last_run_status === "fail" || s.last_run_status === "timed out").length;
      const late = enabled.filter((s) => {
        if (!s.last_run_at) return false;
        const due = nextDueAfter(options.jobs[s.job_name]!.schedule, s.last_run_at);
        return due !== null && due.getTime() + CRON_LATE_GRACE_MS < now;
      }).length;
      const problems = [failed && `${failed} failed`, late && `${late} late`].filter(Boolean).join(" · ");
      return {
        key: "cron",
        group: "system",
        label: "Cron jobs",
        value: problems || `${enabled.length} on schedule`,
        detail: `${disabled} disabled${problems ? ` · ${enabled.length} enabled` : ""}`,
        tone: failed || late ? "bad" : "ok",
      };
    },
  };
}
