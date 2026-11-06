import { describe, it, expect, beforeAll } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { cronDb } from "@saflib/cron-db";
import { setEnabled } from "./set-enabled.ts";
import { claimTick } from "./claim-tick.ts";

describe("claimTick", () => {
  let dbKey: DbKey;
  beforeAll(() => {
    dbKey = cronDb.connect();
  });

  it("lets one caller claim a tick, and the next tick again", async () => {
    await setEnabled(dbKey, "tick-job", true, "admin-1");
    const tick = new Date("2026-11-02T10:00:00Z");
    expect((await claimTick(dbKey, "tick-job", tick)).result).toBe(true);
    expect((await claimTick(dbKey, "tick-job", tick)).result).toBe(false);
    const next = new Date("2026-11-02T10:01:00Z");
    expect((await claimTick(dbKey, "tick-job", next)).result).toBe(true);
    expect((await claimTick(dbKey, "tick-job", tick)).result).toBe(false);
  });

  it("claims nothing for an unknown job", async () => {
    const tick = new Date("2026-11-02T10:00:00Z");
    expect((await claimTick(dbKey, "no-such-job", tick)).result).toBe(false);
  });
});
