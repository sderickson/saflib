import { describe, it, expect } from "vitest";
import type { MetricSnapshot } from "@saflib/node-metrics-spec";
import {
  filterMetrics,
  groupMetricsByLabel,
  uniqueLabelKeys,
  uniqueMetricNames,
} from "./MetricsPage.logic.ts";

const sampleMetrics: MetricSnapshot[] = [
  {
    name: "http_requests_total",
    type: "counter",
    labels: { method: "GET", status: "200" },
    value: 10,
  },
  {
    name: "http_requests_total",
    type: "counter",
    labels: { method: "POST", status: "200" },
    value: 4,
  },
  {
    name: "process_resident_memory_bytes",
    type: "gauge",
    labels: {},
    value: 999,
  },
];

describe("MetricsPage.logic", () => {
  it("lists unique metric names", () => {
    expect(uniqueMetricNames(sampleMetrics)).toEqual([
      "http_requests_total",
      "process_resident_memory_bytes",
    ]);
  });

  it("filters by metric name and label value", () => {
    const filtered = filterMetrics(sampleMetrics, "http_requests_total", [
      { labelKey: "method", labelValue: "GET" },
    ]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.labels.method).toBe("GET");
  });

  it("groups metrics by a label key", () => {
    const grouped = groupMetricsByLabel(
      filterMetrics(sampleMetrics, "http_requests_total", []),
      "method",
    );
    expect(grouped.map((g) => g.groupLabel)).toEqual(["GET", "POST"]);
  });

  it("collects unique label keys", () => {
    expect(uniqueLabelKeys(sampleMetrics)).toEqual(["method", "status"]);
  });
});
