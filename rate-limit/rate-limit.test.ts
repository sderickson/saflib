import { describe, it, expect } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createFixedWindowLimiter, createMemoryStore, createSqliteStore } from "./index.ts";

const stores = {
  memory: () => createMemoryStore(),
  sqlite: () => createSqliteStore({ path: join(mkdtempSync(join(tmpdir(), "rl-")), "rl.sqlite"), name: "t" }),
};

for (const [kind, makeStore] of Object.entries(stores)) {
  describe(`fixed window limiter (${kind})`, () => {
    it("allows up to the limit per key per window, then resets", () => {
      let t = 60_000;
      const limiter = createFixedWindowLimiter({ limit: 2, windowMs: 60_000, store: makeStore(), now: () => t });
      expect([limiter.hit("a"), limiter.hit("a"), limiter.hit("a")]).toEqual([true, true, false]);
      expect(limiter.hit("b")).toBe(true);
      expect(limiter.blocked("a")).toBe(true);
      expect(limiter.blocked("b")).toBe(false);
      t += 15_000;
      expect(limiter.retryAfterSeconds("a")).toBe(45);
      expect(limiter.retryAfterSeconds("never")).toBe(0);
      t = 120_000;
      expect(limiter.blocked("a")).toBe(false);
      expect(limiter.hit("a")).toBe(true);
    });
  });
}

describe("sqlite store", () => {
  it("shares counts between limiters on the same file and name, not across names", () => {
    const path = join(mkdtempSync(join(tmpdir(), "rl-")), "rl.sqlite");
    const now = () => 0;
    const a = createFixedWindowLimiter({ limit: 2, windowMs: 1000, store: createSqliteStore({ path, name: "x" }), now });
    const b = createFixedWindowLimiter({ limit: 2, windowMs: 1000, store: createSqliteStore({ path, name: "x" }), now });
    const other = createFixedWindowLimiter({ limit: 2, windowMs: 1000, store: createSqliteStore({ path, name: "y" }), now });
    expect([a.hit("k"), b.hit("k"), a.hit("k")]).toEqual([true, true, false]);
    expect(other.hit("k")).toBe(true);
  });
});
