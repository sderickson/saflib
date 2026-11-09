import { describe, expect, it } from "vitest";
import client from "prom-client";
import { observeDbQuery, statusClass } from "./metrics.ts";

describe("statusClass", () => {
  it("groups status codes into classes", () => {
    expect([200, 204, 301, 404, 503].map(statusClass)).toEqual(["2xx", "2xx", "3xx", "4xx", "5xx"]);
    expect(statusClass(0)).toBe("unknown");
    expect(statusClass(42.5)).toBe("unknown");
  });
});

describe("observeDbQuery", () => {
  it("records query durations by outcome", async () => {
    observeDbQuery(0.002, "ok");
    observeDbQuery(0.2, "error");
    const text = await client.register.getSingleMetricAsString("db_query_duration_seconds");
    expect(text).toMatch(/db_query_duration_seconds_count\{[^}]*outcome="ok"[^}]*\} 1/);
    expect(text).toMatch(/db_query_duration_seconds_count\{[^}]*outcome="error"[^}]*\} 1/);
    expect(text).toMatch(/le="0.005",[^}]*outcome="ok"[^}]*\} 1|outcome="ok",le="0.005"\} 1/);
  });
});
