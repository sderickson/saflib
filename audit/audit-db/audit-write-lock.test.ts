import { describe, expect, it } from "vitest";
import { auditWriteLockPath } from "./audit-write-lock.ts";

describe("auditWriteLockPath", () => {
  it("puts the lock beside the connected database file", () => {
    expect(auditWriteLockPath("/data/audit/db-production.sqlite")).toBe(
      "/data/audit/.audit-write.lock",
    );
  });
});
