import { describe, it, expect, beforeEach, afterEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { UnhandledDatabaseError } from "@saflib/drizzle";
import { auditDb } from "../../instances.ts";
import { auditDbManager } from "../../instances.ts";
import { appendAuditEvent } from "./append.ts";
import type { AuditEventEntity } from "../../schemas/audit-event.ts";
import type { AuditRowContent } from "../../types.ts";
import { computeRowHash, GENESIS_HASH } from "../../hash-chain.ts";
import { MixedAuditSchemaVersionError } from "../../errors.ts";
import {
  mapAuditEventSqliteIterateRow,
  verifyAuditChain,
} from "./verify-chain.ts";

type SqliteDatabase = import("better-sqlite3").Database;

function sqlite(dbKey: DbKey): SqliteDatabase {
  const db = auditDbManager.get(dbKey)!;
  return (db as unknown as { session: { client: SqliteDatabase } }).session
    .client;
}

function entityToRowContent(row: AuditEventEntity): AuditRowContent {
  return {
    id: row.id,
    ts: row.ts.getTime(),
    schema_version: row.schema_version,
    source: row.source,
    actor_user_id: row.actor_user_id,
    on_behalf_of_user_id: row.on_behalf_of_user_id,
    auth_method: row.auth_method,
    request_id: row.request_id,
    client_ip: row.client_ip,
    event_type: row.event_type,
    resource_type: row.resource_type,
    resource_id: row.resource_id,
    outcome: row.outcome,
    git_commit_root: row.git_commit_root,
    git_commit_saflib: row.git_commit_saflib,
    env: row.env,
    details: row.details,
  };
}

function baseIterateRaw(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id: "raw-id",
    ts: 1_700_000_000_000,
    prev_hash: GENESIS_HASH,
    row_hash: "a".repeat(64),
    schema_version: 1,
    source: "system",
    actor_user_id: null,
    on_behalf_of_user_id: null,
    auth_method: null,
    request_id: null,
    client_ip: null,
    event_type: "evt",
    resource_type: null,
    resource_id: null,
    outcome: "success",
    git_commit_root: "root",
    git_commit_saflib: "saf",
    env: "test",
    details: JSON.stringify({
      source: "system",
      operation: "op",
    }),
    ...overrides,
  };
}

describe("mapAuditEventSqliteIterateRow", () => {
  it("parses details from a JSON string", () => {
    const row = mapAuditEventSqliteIterateRow(baseIterateRaw());
    expect(row.details).toEqual({ source: "system", operation: "op" });
  });

  it("parses details from a driver-supplied object", () => {
    const row = mapAuditEventSqliteIterateRow(
      baseIterateRaw({
        details: { source: "system", operation: "obj" },
      }),
    );
    expect(row.details).toEqual({ source: "system", operation: "obj" });
  });

  it("maps null and empty-string details to null", () => {
    expect(
      mapAuditEventSqliteIterateRow(baseIterateRaw({ details: null })).details,
    ).toBeNull();
    expect(
      mapAuditEventSqliteIterateRow(baseIterateRaw({ details: "" })).details,
    ).toBeNull();
  });

  it("stringifies non-null optional text columns", () => {
    const row = mapAuditEventSqliteIterateRow(
      baseIterateRaw({
        actor_user_id: "actor-1",
        on_behalf_of_user_id: "behalf-1",
        auth_method: "jwt",
        request_id: "req-9",
        client_ip: "10.0.0.1",
        resource_type: "User",
        resource_id: "res-1",
      }),
    );
    expect(row.actor_user_id).toBe("actor-1");
    expect(row.on_behalf_of_user_id).toBe("behalf-1");
    expect(row.auth_method).toBe("jwt");
    expect(row.request_id).toBe("req-9");
    expect(row.client_ip).toBe("10.0.0.1");
    expect(row.resource_type).toBe("User");
    expect(row.resource_id).toBe("res-1");
  });
});

describe("verifyAuditChain", () => {
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

  it("accepts an empty table", async () => {
    const { result, error } = await verifyAuditChain(dbKey, {});
    expect(error).toBeUndefined();
    assert(result);
    expect(result).toEqual({
      valid: true,
      rowCount: 0,
      headHash: null,
      tailHash: null,
      branchCount: 0,
    });
  });

  it("accepts an empty bounded range when rows exist outside the window", async () => {
    const inside = new Date("2026-08-10T00:00:00.000Z");
    await appendAuditEvent(dbKey, {
      ts: inside,
      source: "system",
      event_type: "inside",
      outcome: "success",
      details: { source: "system", operation: "inside" },
    });

    const { result, error } = await verifyAuditChain(dbKey, {
      from: new Date("2026-09-01T00:00:00.000Z"),
      to: new Date("2026-09-02T00:00:00.000Z"),
    });
    expect(error).toBeUndefined();
    assert(result);
    expect(result).toEqual({
      valid: true,
      rowCount: 0,
      headHash: null,
      tailHash: null,
      branchCount: 0,
    });
  });

  it("accepts a valid single-row chain", async () => {
    await appendAuditEvent(dbKey, {
      ts: new Date("2026-08-01T00:00:00.000Z"),
      source: "system",
      event_type: "one",
      outcome: "success",
      details: { source: "system", operation: "one" },
    });

    const { result, error } = await verifyAuditChain(dbKey, {});
    expect(error).toBeUndefined();
    assert(result?.valid);
    expect(result.rowCount).toBe(1);
    assert(result.headHash && result.tailHash);
    expect(result.headHash).toBe(result.tailHash);
    expect(result.branchCount).toBe(0);
  });

  it("accepts a valid multi-row chain", async () => {
    const t0 = new Date("2026-08-02T00:00:00.000Z");
    await appendAuditEvent(dbKey, {
      ts: t0,
      source: "system",
      event_type: "a",
      outcome: "success",
      details: { source: "system", operation: "a" },
    });
    await appendAuditEvent(dbKey, {
      ts: new Date(t0.getTime() + 1),
      source: "system",
      event_type: "b",
      outcome: "success",
      details: { source: "system", operation: "b" },
    });

    const { result } = await verifyAuditChain(dbKey, {});
    assert(result?.valid);
    expect(result.rowCount).toBe(2);
    assert(result.headHash && result.tailHash);
    expect(result.headHash).not.toBe(result.tailHash);
    expect(result.branchCount).toBe(0);
  });

  it("accepts rows with the same timestamp when they share a parent (branch)", async () => {
    const t = new Date("2026-08-11T00:00:00.000Z");
    const first = await appendAuditEvent(dbKey, {
      ts: t,
      id: "branch-root",
      source: "system",
      event_type: "root",
      outcome: "success",
      details: { source: "system", operation: "root" },
    });
    const second = await appendAuditEvent(dbKey, {
      ts: t,
      id: "branch-a",
      source: "system",
      event_type: "fork-a",
      outcome: "success",
      details: { source: "system", operation: "fork-a" },
    });
    const third = await appendAuditEvent(dbKey, {
      ts: t,
      id: "branch-b",
      source: "system",
      event_type: "fork-b",
      outcome: "success",
      details: { source: "system", operation: "fork-b" },
    });
    assert(first.result && second.result && third.result);

    const branchPrev = first.result.row_hash;
    const branchContent = entityToRowContent(third.result);
    const branchRowHash = computeRowHash(branchPrev, branchContent);
    sqlite(dbKey)
      .prepare(`update audit_event set prev_hash = ?, row_hash = ? where id = ?`)
      .run(branchPrev, branchRowHash, third.result.id);

    const { result, error } = await verifyAuditChain(dbKey, {});
    expect(error).toBeUndefined();
    assert(result?.valid);
    expect(result.rowCount).toBe(3);
    expect(result.branchCount).toBe(1);
  });

  it("orders ties by rowid when appended sequentially", async () => {
    const t = new Date("2026-08-11T01:00:00.000Z");
    await appendAuditEvent(dbKey, {
      ts: t,
      id: "tie-a",
      source: "system",
      event_type: "first",
      outcome: "success",
      details: { source: "system", operation: "a" },
    });
    await appendAuditEvent(dbKey, {
      ts: t,
      id: "tie-z",
      source: "system",
      event_type: "second",
      outcome: "success",
      details: { source: "system", operation: "z" },
    });

    const { result, error } = await verifyAuditChain(dbKey, {});
    expect(error).toBeUndefined();
    assert(result?.valid);
    expect(result.rowCount).toBe(2);
    expect(result.headHash).not.toBe(result.tailHash);
    expect(result.branchCount).toBe(0);
  });

  it("scopes verification to from/to using Date bounds", async () => {
    const lo = new Date("2026-08-03T00:00:00.000Z");
    const mid = new Date("2026-08-03T12:00:00.000Z");
    const hi = new Date("2026-08-04T00:00:00.000Z");
    await appendAuditEvent(dbKey, {
      ts: lo,
      source: "system",
      event_type: "lo",
      outcome: "success",
      details: { source: "system", operation: "lo" },
    });
    await appendAuditEvent(dbKey, {
      ts: mid,
      source: "system",
      event_type: "mid",
      outcome: "success",
      details: { source: "system", operation: "mid" },
    });
    await appendAuditEvent(dbKey, {
      ts: hi,
      source: "system",
      event_type: "hi",
      outcome: "success",
      details: { source: "system", operation: "hi" },
    });

    const scoped = await verifyAuditChain(dbKey, {
      from: lo,
      to: hi,
    });
    assert(scoped.result?.valid);
    expect(scoped.result.rowCount).toBe(3);
  });

  it("accepts from-only when the first matching row is still the chain head", async () => {
    const lo = new Date("2026-08-12T00:00:00.000Z");
    const hi = new Date("2026-08-13T00:00:00.000Z");
    await appendAuditEvent(dbKey, {
      ts: lo,
      source: "system",
      event_type: "head",
      outcome: "success",
      details: { source: "system", operation: "head" },
    });
    await appendAuditEvent(dbKey, {
      ts: hi,
      source: "system",
      event_type: "tail",
      outcome: "success",
      details: { source: "system", operation: "tail" },
    });

    const { result, error } = await verifyAuditChain(dbKey, {
      from: lo.getTime(),
    });
    expect(error).toBeUndefined();
    assert(result?.valid);
    expect(result.rowCount).toBe(2);
  });

  it("accepts to-only bounds", async () => {
    const lo = new Date("2026-08-14T00:00:00.000Z");
    const hi = new Date("2026-08-15T00:00:00.000Z");
    await appendAuditEvent(dbKey, {
      ts: lo,
      source: "system",
      event_type: "a",
      outcome: "success",
      details: { source: "system", operation: "a" },
    });
    await appendAuditEvent(dbKey, {
      ts: hi,
      source: "system",
      event_type: "b",
      outcome: "success",
      details: { source: "system", operation: "b" },
    });

    const { result, error } = await verifyAuditChain(dbKey, {
      to: hi,
    });
    expect(error).toBeUndefined();
    assert(result?.valid);
    expect(result.rowCount).toBe(2);
  });

  it("accepts a row with optional columns populated", async () => {
    await appendAuditEvent(dbKey, {
      ts: new Date("2026-08-16T00:00:00.000Z"),
      source: "http",
      event_type: "api",
      outcome: "success",
      actor_user_id: "user-1",
      on_behalf_of_user_id: "user-2",
      auth_method: "session",
      request_id: "req-xyz",
      client_ip: "192.168.1.1",
      resource_type: "Document",
      resource_id: "doc-1",
      details: {
        source: "http",
        method: "GET",
        route_pattern: "/x",
        path_params: {},
        query_params: {},
        status_code: 200,
        duration_ms: 5,
      },
    });

    const { result, error } = await verifyAuditChain(dbKey, {});
    expect(error).toBeUndefined();
    assert(result?.valid);
    expect(result.rowCount).toBe(1);
  });

  it("honors expectedGenesis when the first prev_hash was rotated to a custom anchor", async () => {
    const inserted = await appendAuditEvent(dbKey, {
      ts: new Date("2026-08-18T00:00:00.000Z"),
      source: "system",
      event_type: "rot",
      outcome: "success",
      details: { source: "system", operation: "rot" },
    });
    assert(inserted.result);

    const customPrev = "3".repeat(64);
    const content = entityToRowContent(inserted.result);
    const newRowHash = computeRowHash(customPrev, content);
    sqlite(dbKey)
      .prepare(
        `update audit_event set prev_hash = ?, row_hash = ? where id = ?`,
      )
      .run(customPrev, newRowHash, inserted.result.id);

    const ok = await verifyAuditChain(dbKey, {
      expectedGenesis: customPrev,
    });
    expect(ok.error).toBeUndefined();
    assert(ok.result?.valid);
    expect(ok.result.rowCount).toBe(1);
  });

  it("reports unknown_prev_hash when expectedGenesis does not match root prev_hash", async () => {
    await appendAuditEvent(dbKey, {
      ts: new Date("2026-08-19T00:00:00.000Z"),
      source: "system",
      event_type: "g2",
      outcome: "success",
      details: { source: "system", operation: "g2" },
    });

    const { result } = await verifyAuditChain(dbKey, {
      expectedGenesis: "2".repeat(64),
    });
    assert(result && !result.valid);
    expect(result.reason).toBe("unknown_prev_hash");
    expect(result.firstBadIndex).toBe(0);
  });

  it("reports row_hash_mismatch when the first row prev_hash was corrupted", async () => {
    const t = new Date("2026-08-05T00:00:00.000Z");
    const row = await appendAuditEvent(dbKey, {
      ts: t,
      source: "system",
      event_type: "g",
      outcome: "success",
      details: { source: "system", operation: "g" },
    });
    assert(row.result);

    sqlite(dbKey)
      .prepare(`update audit_event set prev_hash = ? where id = ?`)
      .run("ff".repeat(32), row.result.id);

    const { result } = await verifyAuditChain(dbKey, {});
    assert(result && !result.valid);
    expect(result.reason).toBe("row_hash_mismatch");
    expect(result.firstBadIndex).toBe(0);
  });

  it("reports unknown_prev_hash for a raw INSERT with a non-genesis prev_hash", async () => {
    const id = "raw-insert-wrong-genesis";
    const tsMs = Date.parse("2026-08-21T00:00:00.000Z");
    const wrongPrev = "f".repeat(64);
    const deployment = process.env.DEPLOYMENT_NAME ?? "audit-db-test";
    sqlite(dbKey)
      .prepare(
        `insert into audit_event (
          id, ts, prev_hash, row_hash, schema_version, source, event_type, outcome,
          git_commit_root, git_commit_saflib, env, details
        ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        tsMs,
        wrongPrev,
        "ab".repeat(32),
        1,
        "system",
        "manual.insert",
        "success",
        "gh-root",
        "gh-saf",
        deployment,
        JSON.stringify({ source: "system", operation: "manual" }),
      );

    const { result } = await verifyAuditChain(dbKey, {});
    assert(result && !result.valid);
    expect(result.reason).toBe("row_hash_mismatch");
    expect(result.firstBadIndex).toBe(0);
    expect(result.firstBadId).toBe(id);
  });

  it("reports row_hash_mismatch when prev_hash was corrupted without recomputing row_hash", async () => {
    const t = new Date("2026-08-06T00:00:00.000Z");
    const first = await appendAuditEvent(dbKey, {
      ts: t,
      source: "system",
      event_type: "p1",
      outcome: "success",
      details: { source: "system", operation: "p1" },
    });
    const second = await appendAuditEvent(dbKey, {
      ts: new Date(t.getTime() + 1),
      source: "system",
      event_type: "p2",
      outcome: "success",
      details: { source: "system", operation: "p2" },
    });
    assert(first.result && second.result);

    sqlite(dbKey)
      .prepare(`update audit_event set prev_hash = ? where id = ?`)
      .run("aa".repeat(32), second.result.id);

    const { result } = await verifyAuditChain(dbKey, {});
    assert(result && !result.valid);
    expect(result.reason).toBe("row_hash_mismatch");
    expect(result.firstBadId).toBe(second.result.id);
    expect(result.firstBadIndex).toBe(1);
  });

  it("reports unknown_prev_hash when prev_hash points at a missing parent with a matching row_hash", async () => {
    const t = new Date("2026-08-06T01:00:00.000Z");
    const first = await appendAuditEvent(dbKey, {
      ts: t,
      source: "system",
      event_type: "orphan-base",
      outcome: "success",
      details: { source: "system", operation: "orphan-base" },
    });
    const second = await appendAuditEvent(dbKey, {
      ts: new Date(t.getTime() + 1),
      source: "system",
      event_type: "orphan-child",
      outcome: "success",
      details: { source: "system", operation: "orphan-child" },
    });
    assert(first.result && second.result);

    const bogusPrev = "aa".repeat(32);
    const content = entityToRowContent(second.result);
    const rowHash = computeRowHash(bogusPrev, content);
    sqlite(dbKey)
      .prepare(`update audit_event set prev_hash = ?, row_hash = ? where id = ?`)
      .run(bogusPrev, rowHash, second.result.id);

    const { result } = await verifyAuditChain(dbKey, {});
    assert(result && !result.valid);
    expect(result.reason).toBe("unknown_prev_hash");
    expect(result.firstBadId).toBe(second.result.id);
    expect(result.firstBadIndex).toBe(1);
  });

  it("reports row_hash_mismatch on the first row", async () => {
    const t = new Date("2026-08-07T00:00:00.000Z");
    const row = await appendAuditEvent(dbKey, {
      ts: t,
      source: "system",
      event_type: "r",
      outcome: "success",
      details: { source: "system", operation: "r" },
    });
    assert(row.result);

    sqlite(dbKey)
      .prepare(`update audit_event set row_hash = ? where id = ?`)
      .run("bb".repeat(32), row.result.id);

    const { result } = await verifyAuditChain(dbKey, {});
    assert(result && !result.valid);
    expect(result.reason).toBe("row_hash_mismatch");
    expect(result.firstBadIndex).toBe(0);
  });

  it("reports row_hash_mismatch when details are mutated without recomputing row_hash", async () => {
    const row = await appendAuditEvent(dbKey, {
      ts: new Date("2026-08-22T00:00:00.000Z"),
      source: "system",
      event_type: "tamper-details",
      outcome: "success",
      details: { source: "system", operation: "orig" },
    });
    assert(row.result);

    sqlite(dbKey)
      .prepare(`update audit_event set details = ? where id = ?`)
      .run(
        JSON.stringify({ source: "system", operation: "tampered" }),
        row.result.id,
      );

    const { result } = await verifyAuditChain(dbKey, {});
    assert(result && !result.valid);
    expect(result.reason).toBe("row_hash_mismatch");
    expect(result.firstBadIndex).toBe(0);
  });

  it("reports row_hash_mismatch on a later row", async () => {
    const t = new Date("2026-08-20T00:00:00.000Z");
    await appendAuditEvent(dbKey, {
      ts: t,
      source: "system",
      event_type: "ok",
      outcome: "success",
      details: { source: "system", operation: "ok" },
    });
    const second = await appendAuditEvent(dbKey, {
      ts: new Date(t.getTime() + 1),
      source: "system",
      event_type: "bad-hash",
      outcome: "success",
      details: { source: "system", operation: "bad-hash" },
    });
    assert(second.result);

    sqlite(dbKey)
      .prepare(`update audit_event set row_hash = ? where id = ?`)
      .run("cc".repeat(32), second.result.id);

    const { result } = await verifyAuditChain(dbKey, {});
    assert(result && !result.valid);
    expect(result.reason).toBe("row_hash_mismatch");
    expect(result.firstBadIndex).toBe(1);
  });

  it("refuses mixed schema_version without expectedGenesis", async () => {
    const t = new Date("2026-08-08T00:00:00.000Z");
    await appendAuditEvent(dbKey, {
      ts: t,
      source: "system",
      event_type: "v1",
      outcome: "success",
      details: { source: "system", operation: "v1" },
    });
    const second = await appendAuditEvent(dbKey, {
      ts: new Date(t.getTime() + 1),
      source: "system",
      event_type: "v2",
      outcome: "success",
      details: { source: "system", operation: "v2" },
    });
    assert(second.result);

    sqlite(dbKey)
      .prepare(`update audit_event set schema_version = 2 where id = ?`)
      .run(second.result.id);

    const { error } = await verifyAuditChain(dbKey, {});
    assert(error);
    expect(error).toBeInstanceOf(MixedAuditSchemaVersionError);
  });

  it("allows mixed schema_version when expectedGenesis is provided (stale row_hash fails)", async () => {
    const t = new Date("2026-08-09T00:00:00.000Z");
    await appendAuditEvent(dbKey, {
      ts: t,
      source: "system",
      event_type: "m1",
      outcome: "success",
      details: { source: "system", operation: "m1" },
    });
    const second = await appendAuditEvent(dbKey, {
      ts: new Date(t.getTime() + 1),
      source: "system",
      event_type: "m2",
      outcome: "success",
      details: { source: "system", operation: "m2" },
    });
    assert(second.result);

    sqlite(dbKey)
      .prepare(`update audit_event set schema_version = 2 where id = ?`)
      .run(second.result.id);

    const out = await verifyAuditChain(dbKey, {
      expectedGenesis: GENESIS_HASH,
    });
    expect(out.error).toBeUndefined();
    assert(out.result && !out.result.valid);
    expect(out.result.reason).toBe("row_hash_mismatch");
  });

  it("maps an unknown DbKey through queryWrapper to UnhandledDatabaseError", async () => {
    const fakeKey = Symbol("not-connected") as unknown as DbKey;
    await expect(verifyAuditChain(fakeKey, {})).rejects.toThrow(
      UnhandledDatabaseError,
    );
  });
});
