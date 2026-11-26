import { describe, expect, it } from "vitest";
import client from "@prometheus-io/client";
import { metricsSummary } from "./metrics-summary.ts";

describe("metricsSummary", () => {
  it("summarizes counters and histograms across series", async () => {
    const registry = new client.Registry();
    const c = new client.Counter({ name: "jobs_total", help: "jobs", labelNames: ["k"], registers: [registry] });
    c.inc({ k: "a" }, 2);
    c.inc({ k: "b" }, 3);
    const h = new client.Histogram({ name: "lat_seconds", help: "latency", labelNames: ["path"], buckets: [0.1, 0.5], registers: [registry] });
    for (let i = 0; i < 18; i++) h.observe({ path: "/a" }, 0.05);
    h.observe({ path: "/b" }, 0.3);
    h.observe({ path: "/b" }, 2);

    const [counter, hist] = await metricsSummary(registry);
    expect(counter).toMatchObject({ name: "jobs_total", type: "counter", series: 2, total: 5, histogram: null });
    expect(hist).toMatchObject({ name: "lat_seconds", type: "histogram", series: 2 });
    expect(hist!.histogram).toMatchObject({
      buckets: [
        { le: "0.1", count: 18 },
        { le: "0.5", count: 1 },
        { le: "+Inf", count: 1 },
      ],
      count: 20,
      p95_le: "0.5",
    });
  });
});
