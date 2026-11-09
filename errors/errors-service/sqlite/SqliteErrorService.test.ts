import { describe, expect, it } from "vitest";
import { issuesDb, listIssues, createRedactionIssueRecorder } from "@saflib/errors-db";
import { throwError } from "@saflib/utils";
import { getErrorCollectors } from "@saflib/node";
import { SqliteErrorService } from "./SqliteErrorService.ts";

describe("SqliteErrorService", () => {
  it("records client and CSP reports as issues and lists latest occurrences", async () => {
    const dbKey = issuesDb.connect();
    const service = new SqliteErrorService({ getDbKey: () => dbKey });
    service.recordReportedError({
      kind: "client",
      message: "TypeError: x is undefined",
      stack: "TypeError: x is undefined\n    at onClick (https://app.example.com/assets/index-B2xQ9z1a.js:1:2)",
      metadata: { route: "/recipes", email: "a@b.co" },
      source: "app",
    });
    service.recordReportedError({ kind: "csp-violation", message: "blocked inline script", source: "app" });

    const { issues } = await throwError(listIssues(dbKey, { sort: "first_seen" }));
    expect(issues.map((i) => [i.kind, i.level, i.title])).toEqual([
      ["csp", "warn", "blocked inline script"],
      ["client", "error", "TypeError: x is undefined"],
    ]);
    const listed = service.listReportedErrors({ kind: "client" });
    expect(listed).toHaveLength(1);
    expect(listed[0]!.metadata).toEqual({ route: "/recipes", email: "[redacted:pii_field]" });
  });

  it("installs a server collector that records warnings and errors", async () => {
    const dbKey = issuesDb.connect();
    const service = new SqliteErrorService({ getDbKey: () => dbKey });
    const before = getErrorCollectors().length;
    service.installServerCollector();
    const collector = getErrorCollectors().at(-1)!;
    expect(getErrorCollectors().length).toBe(before + 1);
    collector({ error: new Error("job went dead: sendEmail"), level: "warning", extra: {}, tags: {}, fingerprint: "jobs.dead:sendEmail" });
    const { issues } = await throwError(listIssues(dbKey, {}));
    expect(issues.map((i) => i.level)).toEqual(["warn"]);
  });
});

describe("createRedactionIssueRecorder", () => {
  it("files one warn issue per leaking kind and template, throttled", async () => {
    const dbKey = issuesDb.connect();
    const record = createRedactionIssueRecorder({ getDbKey: () => dbKey, minIntervalMs: 60_000 });
    const event = {
      detections: [
        { kind: "email", where: "message" },
        { kind: "secret_field", where: "fields.token" },
      ],
      templateHash: "abc",
      template: "sent invite to <redacted>",
      serviceName: "svc",
      operationName: "invite",
    };
    record(event);
    record(event);
    const { issues } = await throwError(listIssues(dbKey, { sort: "first_seen" }));
    expect(issues.map((i) => [i.kind, i.level, i.count, i.title]).sort()).toEqual([
      ["redaction", "warn", 1, "Log line leaks email (masked): sent invite to <redacted>"],
      ["redaction", "warn", 1, "Log line leaks secret_field (masked): sent invite to <redacted>"],
    ]);
  });
});
