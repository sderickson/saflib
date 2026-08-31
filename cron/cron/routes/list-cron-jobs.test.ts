import { describe, it, expect, beforeEach, assert } from "vitest";
import request from "supertest";
import express from "express";
import { createApp } from "../http.ts";
import { cronDb, setEnabled } from "@saflib/cron-db";
import type { JobSetting } from "@saflib/cron-db";
import type { JobSettings } from "@saflib/cron-spec";
import type { DbKey } from "@saflib/drizzle";
import { mockEnqueueJob, mockJobs } from "../mock-jobs.ts";
import { makeAdminHeaders } from "@saflib/express";

describe("GET /jobs", () => {
  let app: express.Express;
  let dbKey: DbKey;

  // Store seeded settings to compare against later
  let seededSettings: JobSetting[] = [];

  beforeEach(async () => {
    // Recreate db instance for each test for isolation
    dbKey = cronDb.connect();
    app = createApp({ dbKey, jobs: mockJobs, enqueueJob: mockEnqueueJob });

    seededSettings = []; // Reset seeded settings

    // Seed test data using setEnabledByName (upsert)
    const { result: setting1 } = await setEnabled(
      dbKey,
      "job1",
      true,
      "admin-1",
    );
    const { result: setting2 } = await setEnabled(
      dbKey,
      "job2",
      false,
    );
    assert(setting1 && setting2);
    seededSettings.push(setting1, setting2);
  });

  it("should return a list of all cron jobs", async () => {
    const response = await request(app)
      .get("/cron/jobs")
      .set(makeAdminHeaders());

    expect(response.status).toBe(200);

    // Construct expected body based on the actual seeded data and the mapping
    const expectedBody: JobSettings[] = seededSettings.map((setting) => ({
      id: setting.id,
      job_name: setting.job_name,
      enabled: setting.enabled,
      enabled_by: setting.enabled_by,
      last_run_at: setting.last_run_at
        ? setting.last_run_at.toISOString()
        : null,
      last_run_status: setting.last_run_status,
      schedule: null,
      runs_next_at: null,
      created_at: setting.created_at.toISOString(),
      updated_at: setting.updated_at.toISOString(),
    }));

    // Sort arrays by job_name to ensure order doesn't affect comparison
    // Explicitly type parameters
    const sortedResponseBody = [...response.body].sort(
      (a: JobSettings, b: JobSettings) =>
        a.job_name.localeCompare(b.job_name),
    );
    const sortedExpectedBody = [...expectedBody].sort(
      (a: JobSettings, b: JobSettings) =>
        a.job_name.localeCompare(b.job_name),
    );

    expect(sortedResponseBody).toEqual(sortedExpectedBody);
  });
});
