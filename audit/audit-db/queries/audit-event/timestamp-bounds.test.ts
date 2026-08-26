import { describe, it, expect, beforeEach, afterEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { UnhandledDatabaseError } from "@saflib/drizzle";
import { auditDb } from "../../instances.ts";
import { appendAuditEvent } from "./append.ts";
import { getAuditEventTimestampBounds } from "./timestamp-bounds.ts";

describe("getAuditEventTimestampBounds", () => {
  let dbKey: DbKey;
  let prevDeploymentName: string | undefined;

  beforeEach(() => {
    prevDeploymentName = process.env.DEPLOYMENT_NAME;
    process.env.DEPLOYMENT_NAME = "audit-bounds-test";
    dbKey = auditDb.connect();
  });

  afterEach(() => {
    auditDb.disconnect(dbKey);
    if (prevDeploymentName === undefined) {
      delete process.env.DEPLOYMENT_NAME;
    } else {
      process.env.DEPLOYMENT_NAME = prevDeploymentName;
    }
  });

  it("returns nulls when empty", async () => {
    const { result, error } = await getAuditEventTimestampBounds(dbKey);
    expect(error).toBeUndefined();
    expect(result!.headAt).toBeNull();
    expect(result!.tailAt).toBeNull();
  });

  it("returns min and max ts", async () => {
    const early = new Date("2026-01-02T00:00:00.000Z");
    const late = new Date("2026-01-05T00:00:00.000Z");
    const mid = new Date("2026-01-03T00:00:00.000Z");
    for (const ts of [mid, early, late]) {
      const r = await appendAuditEvent(dbKey, {
        ts,
        source: "system",
        event_type: "e",
        outcome: "success",
        details: { source: "system", operation: "e" },
      });
      assert(r.result);
    }

    const { result, error } = await getAuditEventTimestampBounds(dbKey);
    expect(error).toBeUndefined();
    expect(result!.headAt!.getTime()).toBe(early.getTime());
    expect(result!.tailAt!.getTime()).toBe(late.getTime());
  });

  it("maps an unknown DbKey through queryWrapper to UnhandledDatabaseError", async () => {
    const fakeKey = Symbol("not-connected") as unknown as DbKey;
    await expect(getAuditEventTimestampBounds(fakeKey)).rejects.toThrow(
      UnhandledDatabaseError,
    );
  });
});
