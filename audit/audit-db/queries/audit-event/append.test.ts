import { describe, it, expect, beforeEach, afterEach, assert } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { UnhandledDatabaseError } from "@saflib/drizzle";
import { getGitHashes } from "@saflib/node";
import { auditDb } from "../../index.ts";
import { appendAuditEvent } from "./append.ts";
import { verifyAuditChain } from "./verify-chain.ts";
import { GENESIS_HASH, computeRowHash } from "../../hash-chain.ts";
import type { AuditRowContent } from "../../types.ts";

describe("appendAuditEvent", () => {
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

  it("first row chains from genesis and row_hash matches canonical content", async () => {
    const ts = new Date("2026-05-05T12:00:00.000Z");
    const { result, error } = await appendAuditEvent(dbKey, {
      ts,
      source: "system",
      event_type: "audit.test",
      outcome: "success",
      details: { source: "system", operation: "unit" },
    });
    expect(error).toBeUndefined();
    assert(result);
    expect(result.prev_hash).toBe(GENESIS_HASH);
    expect(result.schema_version).toBe(1);

    const content: AuditRowContent = {
      id: result.id,
      ts: ts.getTime(),
      schema_version: 1,
      source: "system",
      actor_user_id: null,
      on_behalf_of_user_id: null,
      auth_method: null,
      request_id: null,
      client_ip: null,
      event_type: "audit.test",
      resource_type: null,
      resource_id: null,
      outcome: "success",
      git_commit_root: result.git_commit_root,
      git_commit_saflib: result.git_commit_saflib,
      env: result.env,
      details: result.details,
    };
    expect(result.row_hash).toBe(computeRowHash(GENESIS_HASH, content));

    const hashes = getGitHashes();
    expect(result.git_commit_root).toBe(hashes.root);
    expect(result.git_commit_saflib).toBe(hashes.saflib);
  });

  it("chains three rows with matching prev_hash links and passes verifyAuditChain", async () => {
    const t0 = new Date("2026-05-05T18:00:00.000Z");
    const first = await appendAuditEvent(dbKey, {
      ts: t0,
      source: "system",
      event_type: "three.a",
      outcome: "success",
      details: { source: "system", operation: "a" },
    });
    const second = await appendAuditEvent(dbKey, {
      ts: new Date(t0.getTime() + 1),
      source: "system",
      event_type: "three.b",
      outcome: "success",
      details: { source: "system", operation: "b" },
    });
    const third = await appendAuditEvent(dbKey, {
      ts: new Date(t0.getTime() + 2),
      source: "system",
      event_type: "three.c",
      outcome: "success",
      details: { source: "system", operation: "c" },
    });
    assert(first.result && second.result && third.result);

    expect(first.result.prev_hash).toBe(GENESIS_HASH);
    expect(second.result.prev_hash).toBe(first.result.row_hash);
    expect(third.result.prev_hash).toBe(second.result.row_hash);

    const verified = await verifyAuditChain(dbKey, {});
    expect(verified.error).toBeUndefined();
    assert(verified.result?.valid);
    expect(verified.result.rowCount).toBe(3);
  });

  it("uses the tail row when choosing prev_hash", async () => {
    const ts1 = new Date("2026-05-05T12:00:00.000Z");
    const first = await appendAuditEvent(dbKey, {
      ts: ts1,
      source: "system",
      event_type: "e1",
      outcome: "success",
      details: { source: "system", operation: "a" },
    });
    assert(first.result);

    const ts2 = new Date("2026-05-05T12:00:01.000Z");
    const second = await appendAuditEvent(dbKey, {
      ts: ts2,
      source: "system",
      event_type: "e2",
      outcome: "success",
      details: { source: "system", operation: "b" },
    });
    assert(second.result);
    expect(second.result.prev_hash).toBe(first.result.row_hash);
  });

  it("uses explicit id when provided (and hashes use that id)", async () => {
    const ts = new Date("2026-05-05T13:00:00.000Z");
    const explicitId = "explicit-id-for-append-test";
    const { result, error } = await appendAuditEvent(dbKey, {
      id: explicitId,
      ts,
      source: "http",
      event_type: "matter.read",
      outcome: "success",
      details: {
        source: "http",
        method: "GET",
        route_pattern: "/m/:id",
        path_params: {},
        query_params: {},
        status_code: 200,
        duration_ms: 1,
      },
    });
    expect(error).toBeUndefined();
    assert(result);
    expect(result.id).toBe(explicitId);

    const content: AuditRowContent = {
      id: explicitId,
      ts: ts.getTime(),
      schema_version: 1,
      source: "http",
      actor_user_id: null,
      on_behalf_of_user_id: null,
      auth_method: null,
      request_id: null,
      client_ip: null,
      event_type: "matter.read",
      resource_type: null,
      resource_id: null,
      outcome: "success",
      git_commit_root: result.git_commit_root,
      git_commit_saflib: result.git_commit_saflib,
      env: result.env,
      details: result.details,
    };
    expect(result.row_hash).toBe(computeRowHash(GENESIS_HASH, content));
  });

  it("stores null details when details is omitted", async () => {
    const { result, error } = await appendAuditEvent(dbKey, {
      ts: new Date("2026-05-05T14:00:00.000Z"),
      source: "cron",
      event_type: "cron.job",
      outcome: "success",
    });
    expect(error).toBeUndefined();
    assert(result);
    expect(result.details).toBeNull();
  });

  it("writes nullable strict columns when provided", async () => {
    const { result, error } = await appendAuditEvent(dbKey, {
      ts: new Date("2026-05-05T15:00:00.000Z"),
      source: "kratos",
      actor_user_id: "kratos-user-1",
      on_behalf_of_user_id: null,
      auth_method: "kratos_webhook",
      request_id: "req-xyz",
      client_ip: "203.0.113.7",
      event_type: "auth.login.success",
      resource_type: "session",
      resource_id: "sess-1",
      outcome: "success",
      details: {
        source: "kratos",
        stage: "login.after.password",
        flow_id: "flow-1",
        identity_id: "kratos-user-1",
        success: true,
      },
    });
    expect(error).toBeUndefined();
    assert(result);
    expect(result.actor_user_id).toBe("kratos-user-1");
    expect(result.auth_method).toBe("kratos_webhook");
    expect(result.request_id).toBe("req-xyz");
    expect(result.client_ip).toBe("203.0.113.7");
    expect(result.resource_type).toBe("session");
    expect(result.resource_id).toBe("sess-1");
  });

  it("allows webhook-shaped details", async () => {
    const { result, error } = await appendAuditEvent(dbKey, {
      ts: new Date("2026-05-05T16:00:00.000Z"),
      source: "webhook",
      event_type: "webhook.received",
      outcome: "success",
      details: { source: "webhook", hook: "custom", payload: { n: 1 } },
    });
    expect(error).toBeUndefined();
    assert(result);
    expect(result.details).toEqual({
      source: "webhook",
      hook: "custom",
      payload: { n: 1 },
    });
  });

  it("chains rows with the same timestamp in insertion order (not lexicographic id)", async () => {
    const ts = new Date("2026-05-05T22:00:00.000Z");
    const first = await appendAuditEvent(dbKey, {
      id: "zzz-same-ts-tail",
      ts,
      source: "system",
      event_type: "same-ts.a",
      outcome: "success",
      details: { source: "system", operation: "same-ts.a" },
    });
    const second = await appendAuditEvent(dbKey, {
      id: "aaa-same-ts-head",
      ts,
      source: "system",
      event_type: "same-ts.b",
      outcome: "success",
      details: { source: "system", operation: "same-ts.b" },
    });
    assert(first.result && second.result);

    expect(second.result.prev_hash).toBe(first.result.row_hash);

    const verified = await verifyAuditChain(dbKey, {});
    expect(verified.error).toBeUndefined();
    assert(verified.result?.valid);
    expect(verified.result.rowCount).toBe(2);
  });

  it("serializes concurrent appends with the same timestamp into a valid chain", async () => {
    const ts = new Date("2026-05-05T22:30:00.000Z");
    const [outA, outB] = await Promise.all([
      appendAuditEvent(dbKey, {
        id: "conc-same-ts-a",
        ts,
        source: "system",
        event_type: "conc-same.a",
        outcome: "success",
        details: { source: "system", operation: "conc-same.a" },
      }),
      appendAuditEvent(dbKey, {
        id: "conc-same-ts-b",
        ts,
        source: "system",
        event_type: "conc-same.b",
        outcome: "success",
        details: { source: "system", operation: "conc-same.b" },
      }),
    ]);
    assert(outA.result && outB.result);

    const verified = await verifyAuditChain(dbKey, {});
    expect(verified.error).toBeUndefined();
    assert(verified.result?.valid);
    expect(verified.result.rowCount).toBe(2);
  });

  it("serializes concurrent appends into a valid chain", async () => {
    const base = new Date("2026-05-05T21:00:00.000Z");
    const [outA, outB] = await Promise.all([
      appendAuditEvent(dbKey, {
        ts: base,
        source: "system",
        event_type: "conc.a",
        outcome: "success",
        details: { source: "system", operation: "conc.a" },
      }),
      appendAuditEvent(dbKey, {
        ts: new Date(base.getTime() + 1),
        source: "system",
        event_type: "conc.b",
        outcome: "success",
        details: { source: "system", operation: "conc.b" },
      }),
    ]);
    assert(outA.result && outB.result);

    const ordered = [outA.result, outB.result].sort(
      (a, b) => a.ts.getTime() - b.ts.getTime(),
    );
    expect(ordered[1]!.prev_hash).toBe(ordered[0]!.row_hash);

    const verified = await verifyAuditChain(dbKey, {});
    expect(verified.error).toBeUndefined();
    assert(verified.result?.valid);
    expect(verified.result.rowCount).toBe(2);
  });

  it("propagates sqlite failures through queryWrapper as UnhandledDatabaseError", async () => {
    const ts = new Date("2026-05-05T17:00:00.000Z");
    const id = "duplicate-primary-key-test-id";
    const params = {
      id,
      ts,
      source: "system" as const,
      event_type: "dup.test",
      outcome: "success" as const,
      details: { source: "system", operation: "once" } as const,
    };

    assert((await appendAuditEvent(dbKey, params)).result);

    await expect(appendAuditEvent(dbKey, params)).rejects.toThrow(
      UnhandledDatabaseError,
    );
  });
});
