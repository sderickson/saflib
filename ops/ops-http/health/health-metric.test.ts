import { describe, expect, it } from "vitest";
import client from "prom-client";
import { registerHealthCheckMetric } from "./health-metric.ts";

describe("saf_health_check_status", () => {
  it("reports each check's status at scrape time", async () => {
    let audit: "ok" | "fail" = "ok";
    registerHealthCheckMetric([
      { name: "disk", run: async () => ({ status: "ok", summary: "fine" }) },
      { name: "audit-rotation", run: async () => ({ status: audit, summary: "x" }) },
      { name: "jobs", run: async () => ({ status: "warn", summary: "a dead job" }) },
    ]);
    const scrape = () => client.register.getSingleMetricAsString("saf_health_check_status");
    let text = await scrape();
    expect(text).toMatch(/saf_health_check_status\{check="disk"\} 0/);
    expect(text).toMatch(/saf_health_check_status\{check="audit-rotation"\} 0/);
    expect(text).toMatch(/saf_health_check_status\{check="jobs"\} 1/);
    audit = "fail";
    text = await scrape();
    expect(text).toMatch(/saf_health_check_status\{check="audit-rotation"\} 2/);
  });
});
