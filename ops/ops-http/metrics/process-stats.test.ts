import { describe, expect, it } from "vitest";
import client from "@prometheus-io/client";
import { histogramTotals, p95UpperMs, processStats } from "./process-stats.ts";

describe("process stats", () => {
  it("finds the p95 bucket across label sets", () => {
    const samples = [
      { metricName: "h_bucket", labels: { le: 0.1, path: "/a" }, value: 90 },
      { metricName: "h_bucket", labels: { le: 0.5, path: "/a" }, value: 96 },
      { metricName: "h_bucket", labels: { le: "+Inf", path: "/a" }, value: 100 },
      { metricName: "h_count", labels: { path: "/a" }, value: 100 },
    ];
    const { count, buckets } = histogramTotals(samples, "h");
    expect(count).toBe(100);
    expect(p95UpperMs(count, buckets)).toBe(500);
    expect(p95UpperMs(0, buckets)).toBeNull();
  });

  it("reads this process's request histogram", async () => {
    const registry = new client.Registry();
    const h = new client.Histogram({
      name: "http_request_duration_seconds",
      help: "x",
      labelNames: ["path"],
      buckets: [0.05, 0.1],
      registers: [registry],
    });
    for (let i = 0; i < 20; i++) h.observe({ path: "/x" }, 0.01);
    const stats = await processStats(registry);
    expect(stats.requests_total).toBe(20);
    expect(stats.p95_upper_ms).toBe(50);
    expect(stats.rss_bytes).toBeGreaterThan(0);
  });
});
