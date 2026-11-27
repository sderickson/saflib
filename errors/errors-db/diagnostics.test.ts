import { beforeEach, describe, expect, it } from "vitest";
import type { DbKey } from "@saflib/drizzle";
import { throwError } from "@saflib/utils";
import {
  diagnosticProbeOf,
  findOccurrenceContaining,
  getIssue,
  isDiagnosticIssueTitle,
  issuesDb,
  recordOccurrence,
  resolveDiagnosticIssues,
} from "./index.ts";

describe("diagnostics test signals", () => {
  let dbKey: DbKey;
  beforeEach(() => {
    dbKey = issuesDb.connect();
  });

  const base = { level: "error" as const, kind: "server", serviceName: "svc" };

  it("recognizes tagged messages and CSP probe titles", () => {
    expect(diagnosticProbeOf("[diag:ab12cd] server-500: boom")).toBe("server-500");
    expect(diagnosticProbeOf("boom")).toBeUndefined();
    expect(isDiagnosticIssueTitle("[diag:ab12cd] client-vue: thrown")).toBe(true);
    expect(isDiagnosticIssueTitle("CSP img-src blocked https://diag-ab12cd.invalid on admin.x")).toBe(true);
    expect(isDiagnosticIssueTitle("Prometheus unreachable")).toBe(false);
  });

  it("groups each probe's runs into one issue, finds a run, and resolves only test issues", async () => {
    const first = recordOccurrence(dbKey, { ...base, message: "[diag:run1aaaa] server-500: thrown on purpose" });
    const second = recordOccurrence(dbKey, { ...base, message: "[diag:run2bbbb] server-500: thrown on purpose" });
    expect(second.group.id).toBe(first.group.id);
    const real = recordOccurrence(dbKey, { ...base, message: "real failure" });

    const found = findOccurrenceContaining(dbKey, "[diag:run2bbbb] server-500", new Date(Date.now() - 60_000));
    expect(found).toMatchObject({ groupId: first.group.id, occurrenceId: second.occurrenceId });
    expect(findOccurrenceContaining(dbKey, "[diag:run2bbbb] client-vue", new Date(0))).toBeNull();
    // LIKE wildcards are literal.
    expect(findOccurrenceContaining(dbKey, "run_bbbb", new Date(0))).toBeNull();

    expect(await resolveDiagnosticIssues(dbKey, "admin")).toBe(1);
    expect((await throwError(getIssue(dbKey, first.group.id)))?.status).toBe("resolved");
    expect((await throwError(getIssue(dbKey, real.group.id)))?.status).toBe("open");
  });
});
