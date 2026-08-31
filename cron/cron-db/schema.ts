import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";

const lastRunStatusEnum = ["success", "fail", "running", "timed out"] as const;

export type LastRunStatus = (typeof lastRunStatusEnum)[number];

/**
 * The current state and settings of a cron job.
 */
export interface JobSetting {
  id: number;
  job_name: string;
  enabled: boolean;
  /** Kratos identity id of the admin who last enabled the job; null until re-enabled post-migration. */
  enabled_by: string | null;
  last_run_at: Date | null;
  last_run_status: (typeof lastRunStatusEnum)[number] | null;
  created_at: Date;
  updated_at: Date;
}

export const jobSettings = sqliteTable("job_settings", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  job_name: text("job_name").notNull().unique(),
  enabled: integer("enabled", { mode: "boolean" }).notNull(), // Store boolean as integer 0/1
  enabled_by: text("enabled_by"), // Nullable Kratos identity id
  last_run_at: integer("last_run_at", { mode: "timestamp" }), // Nullable timestamp
  last_run_status: text("last_run_status", {
    enum: lastRunStatusEnum,
  }), // Nullable status enum
  created_at: integer("created_at", { mode: "timestamp" }).notNull(),
  updated_at: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export type JobSettingTest1 = Expect<
  Equal<JobSetting, typeof jobSettings.$inferSelect>
>;
