import { describe, it, expect } from "vitest";
import * as pkg from "./index.ts";

describe("@pathclerk/daemon-audit-db package exports", () => {
  it("exposes the Phase 1 public surface", () => {
    expect(pkg.auditDb).toBeDefined();
    expect(pkg.canonicalizeAuditRow).toBeDefined();
    expect(pkg.computeRowHash).toBeDefined();
    expect(pkg.GENESIS_HASH).toBeDefined();
    expect(pkg.appendAuditEvent).toBeDefined();
    expect(pkg.listAuditEventsByTimestamp).toBeDefined();
    expect(pkg.getAuditEventTimestampBounds).toBeDefined();
    expect(pkg.verifyAuditChain).toBeDefined();

    expect(pkg).not.toHaveProperty("auditDbManager");
    expect(pkg).not.toHaveProperty("auditEventTable");
    expect(pkg).not.toHaveProperty("auditSources");
  });
});
