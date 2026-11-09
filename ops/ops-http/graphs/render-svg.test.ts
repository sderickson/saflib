import { describe, expect, it } from "vitest";
import { constantLabelKeys, escapeXml, niceTicks, renderGraphSvg, seriesLabel } from "./render-svg.ts";

describe("graph legend", () => {
  it("labels lines by what differs between them", () => {
    const metrics = [
      { saf_app: "host", job: "prometheus", instance: "localhost:9090" },
      { saf_app: "host", job: "node", instance: "node-exporter:9100" },
    ];
    const constant = constantLabelKeys(metrics);
    expect(seriesLabel(metrics[0]!, constant)).toBe("instance=localhost:9090, job=prometheus");
    expect(seriesLabel(metrics[1]!, constant)).not.toContain("saf_app");
  });

  it("drops scrape identity for a single series, falling back to the metric name", () => {
    const one = [{ __name__: "up", saf_app: "hub", job: "hub", instance: "x:3001" }];
    expect(seriesLabel(one[0]!, constantLabelKeys(one))).toBe("up");
    const route = [{ saf_app: "hub", route: "/ops/health" }];
    expect(seriesLabel(route[0]!, constantLabelKeys(route))).toBe("route=/ops/health");
  });
});

describe("renderGraphSvg", () => {
  it("escapes text and reports no data", () => {
    const svg = renderGraphSvg({ series: [], start: 0, end: 3600, width: 400, height: 200, title: "<b>&" });
    expect(svg).toContain(escapeXml("<b>&"));
    expect(svg).not.toContain("<b>&");
    expect(svg).toContain("No data");
  });

  it("picks round ticks covering the range", () => {
    expect(niceTicks(0, 83)).toEqual([0, 20, 40, 60, 80, 100]);
  });
});
