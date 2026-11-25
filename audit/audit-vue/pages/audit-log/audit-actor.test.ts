import { describe, expect, it } from "vitest";
import { auditActor } from "./audit-actor.ts";

describe("auditActor", () => {
  it("shows ops tokens as machine actors", () => {
    expect(
      auditActor({ source: "http", actor_user_id: "ops_token:a1b2c3", auth_method: "ops_token" }),
    ).toEqual({ kind: "ops-token", label: "a1b2" });
  });
  it("shows people by id", () => {
    expect(auditActor({ source: "http", actor_user_id: "u-1", auth_method: "kratos_session" })).toEqual({
      kind: "user",
      id: "u-1",
    });
  });
  it("shows cron, system and webhook rows by source", () => {
    expect(auditActor({ source: "cron", actor_user_id: "admin", auth_method: null }).kind).toBe("cron");
    expect(auditActor({ source: "system", actor_user_id: null, auth_method: null }).kind).toBe("system");
    expect(auditActor({ source: "webhook", actor_user_id: null, auth_method: null }).kind).toBe("webhook");
    expect(auditActor({ source: "http", actor_user_id: null, auth_method: "none" }).kind).toBe("none");
  });
});
