import { describe, expect, it } from "vitest";
import type { OpsLogGroupResponse } from "@saflib/ops-spec";
import { formatOffset, groupDuration, groupKindLabel, groupStatus, groupTitle, startsOpen } from "./log-format.ts";

const base: OpsLogGroupResponse = {
  kind: "request",
  context_id: "r1",
  line_id: null,
  first_ts: "2026-11-25T10:00:00.000Z",
  last_ts: "2026-11-25T10:00:03.000Z",
  count: 2,
  errors: 0,
  warnings: 0,
  user_id: null,
  operation_name: "getMatter",
  service_name: "daemon",
  request: { method: "GET", route: "/matters/{id}", status: 502, duration_ms: 3012, internal: false },
  untrusted: { first_message: "querying" },
};

describe("log group formatting", () => {
  it("describes requests by method, route and status", () => {
    expect(groupKindLabel(base)).toBe("GET");
    expect(groupTitle(base)).toBe("/matters/{id}");
    expect(groupStatus(base)).toEqual({ label: "502", tone: "error" });
    expect(groupDuration(base)).toBe("3.0 s");
  });

  it("describes jobs, process starts and lone lines", () => {
    const job = { ...base, kind: "job", request: null, operation_name: "purgeFiles", errors: 1 };
    expect([groupKindLabel(job), groupTitle(job), groupStatus(job).label]).toEqual(["JOB", "purgeFiles", "failed"]);
    expect(startsOpen(job)).toBe(true);
    const start = { ...base, kind: "process", request: null };
    expect([groupKindLabel(start), groupTitle(start), groupStatus(start).label]).toEqual(["START", "daemon startup", "ready"]);
    const lone = { ...base, kind: null, context_id: null, request: null, warnings: 1 };
    expect([groupKindLabel(lone), groupTitle(lone), groupStatus(lone).label, groupDuration(lone)]).toEqual(["LOG", "querying", "warn", ""]);
    expect(startsOpen(lone)).toBe(false);
  });

  it("formats offsets from the group start", () => {
    expect(formatOffset("2026-11-25T10:00:00.000Z", base.first_ts)).toBe("+0");
    expect(formatOffset("2026-11-25T10:00:00.006Z", base.first_ts)).toBe("+6 ms");
    expect(formatOffset("2026-11-25T10:00:03.000Z", base.first_ts)).toBe("+3.0 s");
  });
});
