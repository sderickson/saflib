import { describe, it, expect } from "vitest";
import { computeRowHash, GENESIS_HASH } from "./hash-chain.ts";
import type { AuditEventDetails } from "./schemas/audit-event.ts";
import type { AuditRowContent } from "./types.ts";

const rowFixture: AuditRowContent = {
  id: "01HZABCDEFGHIJKLMNOPQRSTUV",
  ts: 1715000123456,
  schema_version: 1,
  source: "http",
  actor_user_id: "identity-1",
  on_behalf_of_user_id: null,
  auth_method: "kratos_session",
  request_id: "req-abc",
  client_ip: "203.0.113.1",
  event_type: "matter.read",
  resource_type: "matter",
  resource_id: "matter-1",
  outcome: "success",
  git_commit_root: "abc1234",
  git_commit_saflib: "def5678",
  env: "test",
  details: {
    source: "http",
    route_pattern: "/m/:id",
    method: "GET",
    path_params: { matterId: "m1" },
    query_params: {},
    status_code: 200,
    duration_ms: 5,
  },
};

describe("hash chain", () => {
  it("uses 64 hex zero digits for genesis", () => {
    expect(GENESIS_HASH).toBe("0".repeat(64));
    expect(GENESIS_HASH).toHaveLength(64);
  });

  it("computeRowHash(genesis, fixture) is stable", () => {
    expect(computeRowHash(GENESIS_HASH, rowFixture)).toBe(
      "fcbc619c4f76d62e5a70adbbc4e49291984c5e64ef44261fe750184c18c00769",
    );
  });

  it("changes hash when any canonical byte of the row changes", () => {
    const base = computeRowHash(GENESIS_HASH, rowFixture);

    const tsBump: AuditRowContent = { ...rowFixture, ts: rowFixture.ts + 1 };
    expect(computeRowHash(GENESIS_HASH, tsBump)).not.toBe(base);

    const idTweak: AuditRowContent = {
      ...rowFixture,
      id: `${rowFixture.id.slice(0, -1)}W`,
    };
    expect(computeRowHash(GENESIS_HASH, idTweak)).not.toBe(base);

    const httpDetails = rowFixture.details as Extract<
      AuditEventDetails,
      { source: "http" }
    >;
    const detailsTweak: AuditRowContent = {
      ...rowFixture,
      details: {
        ...httpDetails,
        status_code: 201,
      },
    };
    expect(computeRowHash(GENESIS_HASH, detailsTweak)).not.toBe(base);
  });
});
