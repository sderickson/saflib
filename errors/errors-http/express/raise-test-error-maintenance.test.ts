import type { RequestBody as raiseTestErrorMaintenanceRequestBody } from "@saflib/errors-spec/operations/raiseTestErrorMaintenance";
import express from "express";
import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createErrorMiddleware, makeAdminHeaders, makeUserHeaders } from "@saflib/express";
import { createErrorsRouter } from "./createErrorsRouter.ts";
import { JOBS_RETRY_NEVER_HEADER } from "./raise-test-error-maintenance.ts";

describe("raiseTestErrorMaintenance", () => {
  let prevAdminEmails: string | undefined;

  beforeEach(() => {
    prevAdminEmails = process.env.ADMIN_EMAILS;
    process.env.ADMIN_EMAILS = "admin@example.com";
  });

  afterEach(() => {
    if (prevAdminEmails === undefined) {
      delete process.env.ADMIN_EMAILS;
    } else {
      process.env.ADMIN_EMAILS = prevAdminEmails;
    }
  });

  function makeApp() {
    const app = express();
    app.use(createErrorsRouter());
    app.use(createErrorMiddleware());
    return app;
  }

  it("should return 500 with X-Jobs-Retry: never for a site admin", async () => {
    const response = await request(makeApp())
      .post("/maintenance/raise-test-error")
      .set(makeAdminHeaders("admin-raise-test", "admin@example.com"))
      .send(
        {} satisfies raiseTestErrorMaintenanceRequestBody["raiseTestErrorMaintenance"],
      );

    expect(response.status).toBe(500);
    expect(response.headers["x-jobs-retry"]).toBe(JOBS_RETRY_NEVER_HEADER);
    expect(response.body).toMatchObject({
      message: expect.any(String),
    });
  });

  it("should return 401 when no authentication headers are provided", async () => {
    const response = await request(makeApp())
      .post("/maintenance/raise-test-error")
      .send(
        {} satisfies raiseTestErrorMaintenanceRequestBody["raiseTestErrorMaintenance"],
      );

    expect(response.status).toBe(401);
  });

  it("should return 403 when the caller is not a site admin", async () => {
    const response = await request(makeApp())
      .post("/maintenance/raise-test-error")
      .set(makeUserHeaders("user-raise-test", "user@example.com"))
      .send(
        {} satisfies raiseTestErrorMaintenanceRequestBody["raiseTestErrorMaintenance"],
      );

    expect(response.status).toBe(403);
  });
});
