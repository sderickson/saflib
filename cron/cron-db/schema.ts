import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle-sqlite3";

const lastRunStatusEnum = ["success", "fail", "running", "timed out"] as const;

export type LastRunStatus = (typeof lastRunStatusEnum)[number];

/**
 * The current state and settings of a cron job.
 */
export interface JobSetting {
  id: number;
  jobName: string;
  enabled: boolean;
  lastRunAt: Date | null;
  lastRunStatus: (typeof lastRunStatusEnum)[number] | null;
  createdAt: Date;
  updatedAt: Date;
}

export const jobSettings = sqliteTable("job_settings", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  jobName: text("job_name").notNull().unique(),
  enabled: integer("enabled", { mode: "boolean" }).notNull(), // Store boolean as integer 0/1
  lastRunAt: integer("last_run_at", { mode: "timestamp" }), // Nullable timestamp
  lastRunStatus: text("last_run_status", {
    enum: lastRunStatusEnum,
  }), // Nullable status enum
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export type JobSettingTest1 = Expect<
  Equal<JobSetting, typeof jobSettings.$inferSelect>
>;
