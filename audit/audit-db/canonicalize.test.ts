import { describe, it, expect } from "vitest";
import { canonicalizeAuditRow } from "./canonicalize.ts";
import type { AuditRowContent } from "./types.ts";

/** Same logical row; key insertion orders differ at root and inside nested objects. */
function fixtureA(): AuditRowContent {
  return {
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
}

function fixtureB(): AuditRowContent {
  return {
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
    id: "01HZABCDEFGHIJKLMNOPQRSTUV",
    details: {
      source: "http",
      method: "GET",
      route_pattern: "/m/:id",
      path_params: { matterId: "m1" },
      query_params: {},
      status_code: 200,
      duration_ms: 5,
    },
  };
}

describe("canonicalizeAuditRow", () => {
  it("matches golden output (sorted keys, no whitespace, numeric ts)", () => {
    expect(canonicalizeAuditRow(fixtureA())).toBe(
      '{"actor_user_id":"identity-1","auth_method":"kratos_session","client_ip":"203.0.113.1","details":{"duration_ms":5,"method":"GET","path_params":{"matterId":"m1"},"query_params":{},"route_pattern":"/m/:id","source":"http","status_code":200},"env":"test","event_type":"matter.read","git_commit_root":"abc1234","git_commit_saflib":"def5678","id":"01HZABCDEFGHIJKLMNOPQRSTUV","on_behalf_of_user_id":null,"outcome":"success","request_id":"req-abc","resource_id":"matter-1","resource_type":"matter","schema_version":1,"source":"http","ts":1715000123456}',
    );
  });

  it("produces identical strings for different key insertion orders", () => {
    expect(canonicalizeAuditRow(fixtureA())).toBe(canonicalizeAuditRow(fixtureB()));
  });

  it("preserves null and array order", () => {
    const withNullAndArray: AuditRowContent = {
      id: "x",
      ts: 1,
      schema_version: 1,
      source: "system",
      actor_user_id: null,
      on_behalf_of_user_id: null,
      auth_method: null,
      request_id: null,
      client_ip: null,
      event_type: "t",
      resource_type: null,
      resource_id: null,
      outcome: "success",
      git_commit_root: "a",
      git_commit_saflib: "b",
      env: "dev",
      details: {
        source: "system",
        operation: "op",
        summary: { order: ["third", "first", "second"] },
      },
    };
    expect(canonicalizeAuditRow(withNullAndArray)).toBe(
      '{"actor_user_id":null,"auth_method":null,"client_ip":null,"details":{"operation":"op","source":"system","summary":{"order":["third","first","second"]}},"env":"dev","event_type":"t","git_commit_root":"a","git_commit_saflib":"b","id":"x","on_behalf_of_user_id":null,"outcome":"success","request_id":null,"resource_id":null,"resource_type":null,"schema_version":1,"source":"system","ts":1}',
    );
  });
});
