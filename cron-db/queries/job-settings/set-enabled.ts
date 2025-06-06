import { queryWrapper } from "@saflib/drizzle-sqlite3";
import { jobSettings } from "../../schema.ts";
import type { JobSetting, NewJobSetting } from "../../types.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { cronDbManager } from "../../instances.ts";

export const setEnabled = queryWrapper(
  async (
    dbKey: DbKey,
    jobName: string,
    enabled: boolean,
  ): Promise<JobSetting> => {
    const db = cronDbManager.get(dbKey)!;
    const now = new Date();
    const values: NewJobSetting = {
      jobName,
      enabled,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db
      .insert(jobSettings)
      .values(values)
      .onConflictDoUpdate({
        target: jobSettings.jobName,
        set: {
          enabled: enabled,
          updatedAt: now,
        },
      })
      .returning();

    return result[0];
  },
);
