import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { createApp } from "../http.ts";
import { CronRequest, CronResponse } from "@saflib/cron-spec";
import { mapJobSettingToResponse } from "./_helpers.ts"; // Need helper for response check
import { cronDb, JobSetting } from "@saflib/cron-db";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { throwError } from "@saflib/monorepo";
import { mockJobs } from "../mock-jobs.ts";

const existingJobName = Object.keys(mockJobs)[0];

describe("PUT /jobs/settings", () => {
  let app: express.Express;
  let dbKey: DbKey;
  let existingJob: JobSetting;

  beforeEach(async () => {
    // Recreate db instance for each test for isolation
    dbKey = cronDb.connect();
    app = createApp({ dbKey, jobs: mockJobs });

    // Seed an initial job setting to update
    existingJob = await cronDb.jobSettings.setEnabled(
      dbKey,
      existingJobName,
      true,
    );
  });

  it("should update the enabled status of an existing job and return the updated setting", async () => {
    const updatePayload: CronRequest["updateCronJobSettings"] = {
      jobName: existingJobName,
      enabled: false,
    };

    const response = await request(app)
      .put("/cron/jobs/settings")
      .set("x-user-id", "1")
      .set("x-user-email", "test@example.com")
      .set("x-user-scopes", "cron:write")
      .send(updatePayload);

    expect(response.status).toBe(200);

    // Fetch the updated setting directly from db to create the expected response
    const updatedSetting = await throwError(
      cronDb.jobSettings.getByName(dbKey, existingJobName),
    );

    const expectedBody: CronResponse["updateCronJobSettings"][200] =
      mapJobSettingToResponse(updatedSetting);

    expect(response.body).toEqual(expectedBody);
    expect(response.body.enabled).toBe(false); // Double-check the change
  });

  it("should return 404 if the job name does not exist", async () => {
    const updatePayload: CronRequest["updateCronJobSettings"] = {
      jobName: "non-existent-job",
      enabled: true,
    };

    const response = await request(app)
      .put("/cron/jobs/settings")
      .set("x-user-id", "1")
      .set("x-user-email", "test@example.com")
      .set("x-user-scopes", "cron:write")
      .send(updatePayload);

    expect(response.status).toBe(404);
  });

  // Optional: Add test for invalid payload (e.g., missing jobName)
  // depending on validation middleware, which might not be present here
});
