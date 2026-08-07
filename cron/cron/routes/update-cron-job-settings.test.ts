import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { createApp } from "../http.ts";
import type { CronRequestBody, CronResponseBody } from "@saflib/cron-spec";
import { mapJobSettingToResponse } from "./_helpers.ts"; // Need helper for response check
import { cronDb, jobSettingsDb } from "@saflib/cron-db";
import type { DbKey } from "@saflib/drizzle";
import { throwError } from "@saflib/monorepo";
import { mockEnqueueJob, mockJobs } from "../mock-jobs.ts";
import { makeAdminHeaders } from "@saflib/express";

const existingJobName = Object.keys(mockJobs)[0];

describe("PUT /jobs/settings", () => {
  let app: express.Express;
  let dbKey: DbKey;

  beforeEach(async () => {
    // Recreate db instance for each test for isolation
    dbKey = cronDb.connect();
    app = createApp({ dbKey, jobs: mockJobs, enqueueJob: mockEnqueueJob });
  });

  it("should update the enabled status of an existing job and return the updated setting", async () => {
    const updatePayload: CronRequestBody["updateCronJobSettings"] = {
      jobName: existingJobName,
      enabled: false,
    };

    const response = await request(app)
      .put("/cron/jobs/settings")
      .set(makeAdminHeaders())
      .send(updatePayload);

    expect(response.status).toBe(200);

    // Fetch the updated setting directly from db to create the expected response
    const updatedSetting = await throwError(
      jobSettingsDb.getByName(dbKey, existingJobName),
    );

    const expectedBody: CronResponseBody["updateCronJobSettings"][200] =
      mapJobSettingToResponse(updatedSetting);

    expect(response.body).toEqual(expectedBody);
    expect(response.body.enabled).toBe(false); // Double-check the change
  });

  it("records enabledBy from the calling admin when enabling", async () => {
    const adminId = "admin-who-enables";
    const updatePayload: CronRequestBody["updateCronJobSettings"] = {
      jobName: existingJobName,
      enabled: true,
    };

    const response = await request(app)
      .put("/cron/jobs/settings")
      .set(makeAdminHeaders(adminId))
      .send(updatePayload);

    expect(response.status).toBe(200);
    expect(response.body.enabled).toBe(true);
    expect(response.body.enabledBy).toBe(adminId);

    const updatedSetting = await throwError(
      jobSettingsDb.getByName(dbKey, existingJobName),
    );
    expect(updatedSetting.enabledBy).toBe(adminId);
  });

  it("retains enabledBy when disabling", async () => {
    await request(app)
      .put("/cron/jobs/settings")
      .set(makeAdminHeaders("admin-who-enables"))
      .send({ jobName: existingJobName, enabled: true });

    const response = await request(app)
      .put("/cron/jobs/settings")
      .set(makeAdminHeaders("other-admin"))
      .send({ jobName: existingJobName, enabled: false });

    expect(response.status).toBe(200);
    expect(response.body.enabled).toBe(false);
    expect(response.body.enabledBy).toBe("admin-who-enables");
  });

  it("should return 404 if the job name does not exist", async () => {
    const updatePayload: CronRequestBody["updateCronJobSettings"] = {
      jobName: "non-existent-job",
      enabled: true,
    };

    const response = await request(app)
      .put("/cron/jobs/settings")
      .set(makeAdminHeaders())
      .send(updatePayload);

    expect(response.status).toBe(404);
  });
});
