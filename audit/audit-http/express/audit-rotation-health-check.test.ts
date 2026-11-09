import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { appendAuditEvent } from "@saflib/audit-db/queries/audit-event/append";
import { auditDb } from "@saflib/audit-db/instances";
import { createAuditRotationHealthCheck } from "./audit-rotation-health-check.ts";

const HOUR = 60 * 60 * 1000;

describe("createAuditRotationHealthCheck", () => {
  let dbKey: DbKey;
  let prevDeploymentName: string | undefined;
  beforeEach(() => {
    // appendAuditEvent stores DEPLOYMENT_NAME in the non-null `env` column.
    prevDeploymentName = process.env.DEPLOYMENT_NAME;
    process.env.DEPLOYMENT_NAME = "audit-health-test";
    dbKey = auditDb.connect();
  });
  afterEach(() => {
    auditDb.disconnect(dbKey);
    if (prevDeploymentName === undefined) delete process.env.DEPLOYMENT_NAME;
    else process.env.DEPLOYMENT_NAME = prevDeploymentName;
  });

  async function seed(ageMs: number) {
    await appendAuditEvent(dbKey, {
      ts: new Date(Date.now() - ageMs),
      source: "system",
      event_type: "audit.http.test",
      outcome: "success",
      details: { source: "system", operation: "health-test" },
    });
  }

  const run = () => createAuditRotationHealthCheck({ getAuditDbKey: () => dbKey }).run();

  it("is ok when the active DB is empty", async () => {
    expect((await run()).status).toBe("ok");
  });

  it.each([
    [2 * HOUR, "ok"],
    [25.5 * HOUR, "warn"],
    [27 * HOUR, "fail"],
  ])("oldest row %sms old → %s", async (age, status) => {
    await seed(age);
    const outcome = await run();
    expect(outcome.status).toBe(status);
    expect(outcome.observed?.oldest_age_hours).toBeCloseTo(age / HOUR, 0);
  });
});
