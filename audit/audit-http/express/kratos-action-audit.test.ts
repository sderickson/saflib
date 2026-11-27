import { describe, it, expect } from "vitest";
import { kratosActionAuditEvent, kratosFlowKind } from "./kratos-action-audit.ts";

describe("kratosActionAuditEvent", () => {
  it("records a sign-in with its method, IP and user agent", () => {
    const row = kratosActionAuditEvent(
      {
        body: {
          flow: { id: "f1", request_url: "https://auth.example.com/self-service/login/browser", active: "password" },
          identity: { id: "u1" },
          request_headers: { "x-forwarded-for": ["203.0.113.9, 10.0.0.1"], "User-Agent": ["Firefox"], "X-Request-ID": ["r1"] },
        },
        request: { userAgent: "kratos-hop" },
      },
      new Date("2026-11-26T00:00:00Z"),
    );
    expect(row).toMatchObject({
      event_type: "kratos.login.password.success",
      actor_user_id: "u1",
      resource_id: "u1",
      client_ip: "203.0.113.9",
      request_id: "r1",
      outcome: "success",
      details: { stage: "login.password.success", user_agent: "Firefox", methods: ["password"], flow_id: "f1" },
    });
  });

  it("marks deliveries without an identity as denied", () => {
    const row = kratosActionAuditEvent({ body: { flow: { request_url: "/self-service/settings" } }, request: {} });
    expect(row).toMatchObject({ event_type: "kratos.settings.unknown.failure", outcome: "denied", client_ip: null });
  });

  it("names flows", () => {
    expect(["/self-service/recovery", "/self-service/registration/api", "/x"].map(kratosFlowKind)).toEqual([
      "recovery",
      "registration",
      "selfservice",
    ]);
  });
});
