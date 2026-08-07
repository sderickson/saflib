import { CronJob } from "cron";
import type { JobSetting } from "@saflib/cron-db";
import type { JobSettings } from "@saflib/cron-spec";

/**
 * Next fire time for an enabled job, or null when disabled / schedule invalid.
 */
export function computeRunsNextAt(
  schedule: string | undefined,
  enabled: boolean,
): string | null {
  if (!enabled || schedule == null) {
    return null;
  }
  try {
    const cronJob = CronJob.from({ cronTime: schedule });
    const next = cronJob.nextDate();
    const jsDate = next?.toJSDate();
    return jsDate ? jsDate.toISOString() : null;
  } catch {
    return null;
  }
}

/**
 * Maps a database job setting object to the format expected by the API response.
 * Converts Date objects to ISO strings.
 */
export function mapJobSettingToResponse(
  setting: JobSetting,
  schedule?: string,
): JobSettings {
  return {
    id: setting.id,
    jobName: setting.jobName,
    enabled: setting.enabled,
    enabledBy: setting.enabledBy,
    lastRunAt: setting.lastRunAt ? setting.lastRunAt.toISOString() : null,
    lastRunStatus: setting.lastRunStatus,
    schedule: schedule ?? null,
    runsNextAt: computeRunsNextAt(schedule, setting.enabled),
    createdAt: setting.createdAt.toISOString(),
    updatedAt: setting.updatedAt.toISOString(),
  };
}
