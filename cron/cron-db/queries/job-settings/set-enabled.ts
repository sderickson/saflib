import { queryWrapper } from "@saflib/drizzle-sqlite3";
import { jobSettings, type JobSetting } from "../../schema.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { cronDbManager } from "../../instances.ts";
import type { ReturnsError } from "@saflib/monorepo";

export type SetEnabledResult = ReturnsError<JobSetting, never>;

export const setEnabled = queryWrapper(
  async (
    dbKey: DbKey,
    jobName: string,
    enabled: boolean,
  ): Promise<SetEnabledResult> => {
    const db = cronDbManager.get(dbKey)!;
    const now = new Date();
    const values = {
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

    return { result: result[0] };
  },
);
