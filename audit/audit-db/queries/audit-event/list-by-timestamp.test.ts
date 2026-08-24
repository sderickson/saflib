import { describe, it, expect, beforeEach, afterEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { auditDb } from "../../instances.ts";
import { appendAuditEvent } from "./append.ts";
import { listAuditEventsByTimestamp } from "./list-by-timestamp.ts";
import { InvalidAuditEventCursorError } from "../../errors.ts";

describe("listAuditEventsByTimestamp", () => {
  let dbKey: DbKey;
  let prevDeploymentName: string | undefined;

  beforeEach(() => {
    prevDeploymentName = process.env.DEPLOYMENT_NAME;
    process.env.DEPLOYMENT_NAME = "audit-db-test";
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

  async function appendSystem(
    ts: Date,
    eventType: string,
    id?: string,
  ) {
    const r = await appendAuditEvent(dbKey, {
      ...(id !== undefined ? { id } : {}),
      ts,
      source: "system",
      event_type: eventType,
      outcome: "success",
      details: { source: "system", operation: eventType },
    });
    assert(r.result);
    return r.result;
  }

  function b64(utf8: string): string {
    return Buffer.from(utf8, "utf8").toString("base64");
  }

  it("returns empty page when no rows", async () => {
    const { result, error } = await listAuditEventsByTimestamp(dbKey, {});
    expect(error).toBeUndefined();
    assert(result);
    expect(result.events).toEqual([]);
    expect(result.nextCursor).toBeNull();
  });

  it("returns rows ordered by ts then id", async () => {
    const t = new Date("2026-06-01T10:00:00.000Z");
    const a = await appendSystem(t, "a", "id-a");
    const b = await appendSystem(new Date(t.getTime() + 1), "b", "id-b");
    const { result } = await listAuditEventsByTimestamp(dbKey, {
      limit: 10,
    });
    assert(result);
    expect(result.events.map((e) => e.id)).toEqual([a.id, b.id]);
    expect(result.nextCursor).toBeNull();
  });

  it("filters with from / to using Date or numeric epoch ms", async () => {
    const lo = new Date("2026-06-02T00:00:00.000Z");
    const mid = new Date("2026-06-02T12:00:00.000Z");
    const hi = new Date("2026-06-03T00:00:00.000Z");
    await appendSystem(lo, "lo");
    await appendSystem(mid, "mid");
    await appendSystem(hi, "hi");

    const byDate = await listAuditEventsByTimestamp(dbKey, {
      from: lo,
      to: mid,
    });
    assert(byDate.result);
    expect(byDate.result.events.map((e) => e.event_type)).toEqual(["lo", "mid"]);

    const byMs = await listAuditEventsByTimestamp(dbKey, {
      from: mid.getTime(),
      to: hi.getTime(),
    });
    assert(byMs.result);
    expect(byMs.result.events.map((e) => e.event_type)).toEqual(["mid", "hi"]);
  });

  it("keyset pagination via nextCursor", async () => {
    const base = new Date("2026-06-04T00:00:00.000Z");
    await appendSystem(base, "e0");
    await appendSystem(new Date(base.getTime() + 1000), "e1");
    await appendSystem(new Date(base.getTime() + 2000), "e2");

    const page1 = await listAuditEventsByTimestamp(dbKey, { limit: 2 });
    assert(page1.result);
    expect(page1.result.events.map((e) => e.event_type)).toEqual(["e0", "e1"]);
    assert(page1.result.nextCursor);

    const page2 = await listAuditEventsByTimestamp(dbKey, {
      limit: 2,
      cursor: page1.result.nextCursor,
    });
    assert(page2.result);
    expect(page2.result.events.map((e) => e.event_type)).toEqual(["e2"]);
    expect(page2.result.nextCursor).toBeNull();
  });

  it("orders by id when ts ties", async () => {
    const t = new Date("2026-06-05T00:00:00.000Z");
    await appendSystem(t, "second", "zzz-second");
    const first = await appendSystem(t, "first", "aaa-first");
    const { result } = await listAuditEventsByTimestamp(dbKey, {});
    assert(result);
    expect(result.events.map((e) => e.id)).toEqual([first.id, "zzz-second"]);
  });

  it("uses limit 1 with nextCursor when more rows exist", async () => {
    const t0 = new Date("2026-06-06T00:00:00.000Z");
    await appendSystem(t0, "p0");
    await appendSystem(new Date(t0.getTime() + 1), "p1");
    const { result } = await listAuditEventsByTimestamp(dbKey, { limit: 1 });
    assert(result);
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.event_type).toBe("p0");
    expect(result.nextCursor).not.toBeNull();
  });

  it("ignores empty cursor the same as omitting cursor", async () => {
    const t = new Date("2026-06-07T00:00:00.000Z");
    await appendSystem(t, "only");
    const withEmpty = await listAuditEventsByTimestamp(dbKey, { cursor: "" });
    const without = await listAuditEventsByTimestamp(dbKey, {});
    assert(withEmpty.result);
    assert(without.result);
    expect(withEmpty.result.events.map((e) => e.id)).toEqual(
      without.result.events.map((e) => e.id),
    );
  });

  it("clamps limit 0 up to 1 and high limits down to 1000", async () => {
    const t0 = new Date("2026-06-08T00:00:00.000Z");
    await appendSystem(t0, "q0");
    await appendSystem(new Date(t0.getTime() + 1), "q1");

    const zero = await listAuditEventsByTimestamp(dbKey, { limit: 0 });
    assert(zero.result);
    expect(zero.result.events).toHaveLength(1);

    const huge = await listAuditEventsByTimestamp(dbKey, { limit: 9999 });
    assert(huge.result);
    expect(huge.result.events).toHaveLength(2);
    expect(huge.result.nextCursor).toBeNull();
  });

  it("returns InvalidAuditEventCursorError for undecodable cursor shapes", async () => {
    const cases = [
      "%%%", // decodes to UTF-8 with no '|'
      b64("nodash"),
      b64("NaN|row"),
      b64("5|"),
    ];
    for (const cursor of cases) {
      const { error } = await listAuditEventsByTimestamp(dbKey, { cursor });
      assert(error);
      expect(error).toBeInstanceOf(InvalidAuditEventCursorError);
    }
  });

  it("returns rows newest-first when order is desc", async () => {
    const t = new Date("2026-06-10T10:00:00.000Z");
    const a = await appendSystem(t, "a", "id-a");
    const b = await appendSystem(new Date(t.getTime() + 1), "b", "id-b");
    const { result } = await listAuditEventsByTimestamp(dbKey, {
      limit: 10,
      order: "desc",
    });
    assert(result);
    expect(result.events.map((e) => e.id)).toEqual([b.id, a.id]);
    expect(result.nextCursor).toBeNull();
  });

  it("keyset pagination works with order desc", async () => {
    const base = new Date("2026-06-11T00:00:00.000Z");
    await appendSystem(base, "e0");
    await appendSystem(new Date(base.getTime() + 1000), "e1");
    await appendSystem(new Date(base.getTime() + 2000), "e2");

    const page1 = await listAuditEventsByTimestamp(dbKey, {
      limit: 2,
      order: "desc",
    });
    assert(page1.result);
    expect(page1.result.events.map((e) => e.event_type)).toEqual(["e2", "e1"]);
    assert(page1.result.nextCursor);

    const page2 = await listAuditEventsByTimestamp(dbKey, {
      limit: 2,
      cursor: page1.result.nextCursor,
      order: "desc",
    });
    assert(page2.result);
    expect(page2.result.events.map((e) => e.event_type)).toEqual(["e0"]);
    expect(page2.result.nextCursor).toBeNull();
  });

  it("orders by id descending when ts ties and order is desc", async () => {
    const t = new Date("2026-06-12T00:00:00.000Z");
    await appendSystem(t, "second", "zzz-second");
    const first = await appendSystem(t, "first", "aaa-first");
    const { result } = await listAuditEventsByTimestamp(dbKey, {
      order: "desc",
    });
    assert(result);
    expect(result.events.map((e) => e.id)).toEqual(["zzz-second", first.id]);
  });

  it("combines range filters with keyset cursor", async () => {
    const base = new Date("2026-06-09T12:00:00.000Z");
    const windowEnd = new Date(base.getTime() + 2500);
    await appendSystem(base, "c0");
    await appendSystem(new Date(base.getTime() + 1000), "c1");
    await appendSystem(new Date(base.getTime() + 2000), "c2");

    const firstPage = await listAuditEventsByTimestamp(dbKey, {
      from: base,
      to: windowEnd,
      limit: 1,
    });
    assert(firstPage.result);
    expect(firstPage.result.events.map((e) => e.event_type)).toEqual(["c0"]);
    assert(firstPage.result.nextCursor);

    const secondPage = await listAuditEventsByTimestamp(dbKey, {
      from: base,
      to: windowEnd,
      cursor: firstPage.result.nextCursor,
      limit: 10,
    });
    assert(secondPage.result);
    expect(secondPage.result.events.map((e) => e.event_type)).toEqual([
      "c1",
      "c2",
    ]);
    expect(secondPage.result.nextCursor).toBeNull();
  });
});
