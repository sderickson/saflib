import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { appendAuditEvent } from "@saflib/audit-db/queries/audit-event/append";
import { auditDb } from "@saflib/audit-db/instances";
import { createAuditRotationHealthCheck } from "./audit-rotation-health-check.ts";
import { auditDigestTile } from "./audit-digest-tile.ts";

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

  describe("auditDigestTile", () => {
    const tile = (expectSealing: boolean) =>
      auditDigestTile({ getAuditDbKey: () => dbKey, expectSealing }).tiles({ since: new Date(0) });

    it("is ok when empty or sealed on schedule", async () => {
      expect(await tile(true)).toMatchObject({ value: "Sealed", tone: "ok" });
      await seed(2 * HOUR);
      expect(await tile(true)).toMatchObject({ value: "Sealed on schedule", detail: "Oldest unsealed event 2h old", tone: "ok" });
    });

    it("needs action when overdue where sealing is expected, else notes it", async () => {
      await seed(5 * 24 * HOUR);
      expect(await tile(true)).toMatchObject({ value: "Seal overdue", detail: "Oldest unsealed event 5 days old", tone: "bad" });
      expect(await tile(false)).toMatchObject({ tone: "none", detail: "Oldest unsealed event 5 days old · sealing is off here" });
    });
  });
});

describe("auditDiagnosticProbe", () => {
  it("appends a diagnostics.test event and finds it by run", async () => {
    const { auditDb: db } = await import("@saflib/audit-db/instances");
    const { auditDiagnosticProbe } = await import("./audit-diagnostic-probe.ts");
    const prev = process.env.DEPLOYMENT_NAME;
    process.env.DEPLOYMENT_NAME = "audit-probe-test";
    const key = db.connect();
    const probe = auditDiagnosticProbe({ getAuditDbKey: () => key });
    const since = new Date(Date.now() - 1000);
    expect(await probe.find({ runId: "runAAAA1", since })).toBeNull();
    await probe.run({ runId: "runAAAA1", tag: "[diag:runAAAA1] audit-event" });
    expect(await probe.find({ runId: "runAAAA1", since })).toMatchObject({ ref: { kind: "audit" } });
    expect(await probe.find({ runId: "other999", since })).toBeNull();
    db.disconnect(key);
    if (prev === undefined) delete process.env.DEPLOYMENT_NAME;
    else process.env.DEPLOYMENT_NAME = prev;
  });
});
