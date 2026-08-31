import { CronTime } from "cron";
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
    const cronTime = new CronTime(schedule);
    const next = cronTime.sendAt();
    const jsDate = next?.toJSDate();
    return jsDate ? jsDate.toISOString() : null;
  } catch {
    return null;
  }
}

/**
 * Maps a database job setting object to the format expected by the API response.
 * Converts Date objects to ISO strings and computes runs_next_at.
 */
export function mapJobSettingToResponse(
  setting: JobSetting,
  schedule?: string,
): JobSettings {
  return {
    id: setting.id,
    job_name: setting.job_name,
    enabled: setting.enabled,
    enabled_by: setting.enabled_by,
    last_run_at: setting.last_run_at ? setting.last_run_at.toISOString() : null,
    last_run_status: setting.last_run_status,
    schedule: schedule ?? null,
    runs_next_at: computeRunsNextAt(schedule, setting.enabled),
    created_at: setting.created_at.toISOString(),
    updated_at: setting.updated_at.toISOString(),
  };
}
