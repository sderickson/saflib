import { describe, it, expect, beforeEach, assert } from "vitest";
import request from "supertest";
import express from "express";
import { createApp } from "../http.ts";
import { cronDb, jobSettingsDb, type JobSetting } from "@saflib/cron-db";
import type { JobSettings } from "@saflib/cron-spec";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { mockJobs } from "../mock-jobs.ts";

describe("GET /jobs", () => {
  let app: express.Express;
  let dbKey: DbKey;

  // Store seeded settings to compare against later
  let seededSettings: JobSetting[] = [];

  beforeEach(async () => {
    // Recreate db instance for each test for isolation
    dbKey = cronDb.connect();
    app = createApp({ dbKey, jobs: mockJobs });

    seededSettings = []; // Reset seeded settings

    // Seed test data using setEnabledByName (upsert)
    const { result: setting1 } = await jobSettingsDb.setEnabled(dbKey, "job1", true);
    const { result: setting2 } = await jobSettingsDb.setEnabled(dbKey, "job2", false);
    assert(setting1 && setting2);
    seededSettings.push(setting1, setting2);
  });

  it("should return a list of all cron jobs", async () => {
    const response = await request(app)
      .get("/cron/jobs")
      .set("x-user-id", "1")
      .set("x-user-email", "test@example.com")
      .set("x-user-scopes", "cron:read");

    expect(response.status).toBe(200);

    // Construct expected body based on the actual seeded data and the mapping
    const expectedBody: JobSettings[] = seededSettings.map((setting) => ({
      // Map fields returned by the API (_helpers.ts format)
      id: setting.id, // Use the actual ID from seeding
      jobName: setting.jobName,
      enabled: setting.enabled,
      lastRunAt: setting.lastRunAt ? setting.lastRunAt.toISOString() : null,
      lastRunStatus: setting.lastRunStatus,
      createdAt: setting.createdAt.toISOString(),
      updatedAt: setting.updatedAt.toISOString(),
    }));

    // Sort arrays by jobName to ensure order doesn't affect comparison
    // Explicitly type parameters
    const sortedResponseBody = [...response.body].sort(
      (a: JobSettings, b: JobSettings) => a.jobName.localeCompare(b.jobName),
    );
    const sortedExpectedBody = [...expectedBody].sort(
      (a: JobSettings, b: JobSettings) => a.jobName.localeCompare(b.jobName),
    );

    expect(sortedResponseBody).toEqual(sortedExpectedBody);
  });
});
