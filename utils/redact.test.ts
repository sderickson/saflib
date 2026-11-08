import { describe, expect, it } from "vitest";
import { redactLogEntry, redactString } from "./redact.ts";

const kinds = (r: { detections: { kind: string }[] }) => r.detections.map((d) => d.kind);

describe("redactString", () => {
  it.each([
    ["contact alice@example.com now", "contact [redacted:email] now", "email"],
    ["Authorization: Bearer abc.def-ghi_jkl", "Authorization: [redacted:bearer]", "bearer"],
    [
      "jwt eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTYifQ.SflKxwRJSMeKKF2QT4fwpM",
      "jwt [redacted:jwt]",
      "jwt",
    ],
    [`token safops_${"A".repeat(43)}`, "token [redacted:api_key]", "api_key"],
    ["key AKIAIOSFODNN7EXAMPLE leaked", "key [redacted:api_key] leaked", "api_key"],
    ["card 4111 1111 1111 1111 on file", "card [redacted:card] on file", "card"],
    ["call +1 415 555 0100", "call [redacted:phone]", "phone"],
    ["call (415) 555-0100", "call [redacted:phone]", "phone"],
    [
      "secret Zk9mQ2xwYXJ0aWNsZXNBbmRXYXZlczEyMzQ1Njc4OTA",
      "secret [redacted:high_entropy]",
      "high_entropy",
    ],
  ])("masks %j", (input, expected, kind) => {
    const r = redactString(input);
    expect(r.value).toBe(expected);
    expect(kinds(r)).toEqual([kind]);
  });

  it.each([
    "user 3f2b8c1e-9a4d-4e2f-8b7a-1c2d3e4f5a6b signed in",
    "commit 9c55208a1b2c3d4e5f60718293a4b5c6d7e8f901",
    "took 1794154519000ms",
    "at 12:30:45 on 2026-11-08",
    "listAuditLogsMaintenanceHandlerForAdmins ran",
    "order 1234567890 shipped",
    "card 4111 1111 1111 1112 (fails Luhn)",
  ])("leaves identifiers alone: %j", (input) => {
    const r = redactString(input);
    expect(r.value).toBe(input);
    expect(r.detections).toEqual([]);
  });

  it("strips query strings and fragments without reporting them", () => {
    const r = redactString(
      "GET /recipes/42?q=chicken&token=x#top then https://ex.com/a/b?email=x%40y.com",
    );
    expect(r.value).toBe("GET /recipes/42?[stripped] then https://ex.com/a/b?[stripped]");
    expect(r.detections).toEqual([]);
  });

  it("truncates IPs to their network without reporting them", () => {
    expect(redactString("from 203.0.113.77").value).toBe("from 203.0.113.0");
    expect(redactString("from 2001:db8:85a3:8d3:1319:8a2e:370:7348").value).toBe(
      "from 2001:db8:85a3::",
    );
    expect(redactString("from ::1").value).toBe("from 0:0:0::");
    expect(redactString("from 203.0.113.77").detections).toEqual([]);
  });
});

describe("redactLogEntry", () => {
  it("masks secret and PII field names whole, at any depth", () => {
    const r = redactLogEntry({
      message: "signup",
      fields: {
        userId: "u_123",
        opsTokenId: "t_1",
        service_name: "recipes",
        token_prefix: "AbCd",
        csrfToken: "xyz",
        user: { email: "a@b.co", firstName: "Ada", plan: "pro" },
        name: "Ada Lovelace",
        db_password: "hunter2",
        empty_password: "",
      },
    });
    expect(r.value.fields).toEqual({
      userId: "u_123",
      opsTokenId: "t_1",
      service_name: "recipes",
      token_prefix: "AbCd",
      csrfToken: "[redacted:secret_field]",
      user: { email: "[redacted:pii_field]", firstName: "[redacted:pii_field]", plan: "pro" },
      name: "[redacted:pii_field]",
      db_password: "[redacted:secret_field]",
      empty_password: "",
    });
    expect(r.detections.map((d) => d.where).sort()).toEqual(
      ["fields.csrfToken", "fields.db_password", "fields.name", "fields.user.email", "fields.user.firstName"].sort(),
    );
  });

  it("scans string values and messages, and reports where", () => {
    const r = redactLogEntry({
      message: "failed for bob@example.com",
      fields: { note: "reach me at bob@example.com", tags: ["ok", "x@y.io"] },
    });
    expect(r.value.message).toBe("failed for [redacted:email]");
    expect(r.value.fields).toEqual({
      note: "reach me at [redacted:email]",
      tags: ["ok", "[redacted:email]"],
    });
    expect(r.detections.map((d) => d.where)).toEqual(["message", "fields.note", "fields.tags[1]"]);
  });

  it("serializes errors and dates, and survives cycles", () => {
    const cyclic: Record<string, unknown> = { a: 1 };
    cyclic.self = cyclic;
    const r = redactLogEntry({
      message: "boom",
      fields: {
        err: new Error("bad input from carol@example.com"),
        at: new Date("2026-11-08T00:00:00Z"),
        cyclic,
      },
    });
    const fields = r.value.fields as Record<string, any>;
    expect(fields.err.message).toBe("bad input from [redacted:email]");
    expect(fields.at).toBe("2026-11-08T00:00:00.000Z");
    expect(fields.cyclic.self).toBe("[Circular]");
  });

  it("accepts extra secret and PII keys", () => {
    const r = redactLogEntry(
      { message: "x", fields: { recovery_phrase: "a b c", nickname: "z" } },
      { secretKeys: ["recoveryphrase"], piiKeys: ["nickname"] },
    );
    expect(r.value.fields).toEqual({
      recovery_phrase: "[redacted:secret_field]",
      nickname: "[redacted:pii_field]",
    });
  });
});
