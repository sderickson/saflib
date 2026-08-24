import { auditDb } from "@saflib/audit-db/instances";
import { appendAuditEvent } from "@saflib/audit-db/queries/audit-event/append";
import { canonicalizeAuditRow } from "@saflib/audit-db/canonicalize";
import { computeRowHash, GENESIS_HASH } from "@saflib/audit-db/hash-chain";
import { listAuditEventsByTimestamp } from "@saflib/audit-db/queries/audit-event/list-by-timestamp";
import { getAuditEventTimestampBounds } from "@saflib/audit-db/queries/audit-event/timestamp-bounds";
import { verifyAuditChain } from "@saflib/audit-db/queries/audit-event/verify-chain";
import { describe, expect, it } from "vitest";

describe("@saflib/audit-db public exports", () => {
  it("exposes the documented query surface", () => {
    expect(auditDb).toBeDefined();
    expect(canonicalizeAuditRow).toBeDefined();
    expect(computeRowHash).toBeDefined();
    expect(GENESIS_HASH).toBeDefined();
    expect(appendAuditEvent).toBeDefined();
    expect(listAuditEventsByTimestamp).toBeDefined();
    expect(getAuditEventTimestampBounds).toBeDefined();
    expect(verifyAuditChain).toBeDefined();
  });
});
