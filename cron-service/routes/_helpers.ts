import type { JobSetting } from "@saflib/cron-db";
import type { JobSettings } from "@saflib/cron-spec";

/**
 * Maps a database job setting object to the format expected by the API response.
 * Converts Date objects to ISO strings.
 */
export function mapJobSettingToResponse(setting: JobSetting): JobSettings {
  return {
    id: setting.id,
    jobName: setting.jobName,
    enabled: setting.enabled,
    lastRunAt: setting.lastRunAt ? setting.lastRunAt.toISOString() : null,
    lastRunStatus: setting.lastRunStatus,
    createdAt: setting.createdAt.toISOString(),
    updatedAt: setting.updatedAt.toISOString(),
  };
}
