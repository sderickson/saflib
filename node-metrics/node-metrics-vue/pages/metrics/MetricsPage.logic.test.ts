import { describe, it, expect } from "vitest";
import type { MetricSnapshot } from "@saflib/node-metrics-spec";
import {
  aggregateMetricSeries,
  buildMetricDisplayGroups,
  filterMetrics,
  groupMetricsByLabel,
  histogramStatsText,
  labelKeysForMetric,
  labelValueRows,
  sortedHistogramBuckets,
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

  it("filters by metric name and exact label substring", () => {
    const filtered = filterMetrics(sampleMetrics, "http_requests_total", [
      { labelKey: "method", labelValue: "GET" },
    ]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.labels.method).toBe("GET");
  });

  it("matches label values when the query appears anywhere in the tag", () => {
    const filtered = filterMetrics(sampleMetrics, "http_requests_total", [
      { labelKey: "method", labelValue: "os" },
    ]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.labels.method).toBe("POST");
  });

  it("ignores filters with empty or null values", () => {
    const filtered = filterMetrics(sampleMetrics, "http_requests_total", [
      { labelKey: "method", labelValue: "" },
      { labelKey: "status", labelValue: null as unknown as string },
    ]);
    expect(filtered).toHaveLength(2);
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

  it("lists label keys for a selected metric", () => {
    expect(labelKeysForMetric(sampleMetrics, "http_requests_total")).toEqual([
      "method",
      "status",
    ]);
  });

  it("collapses to one row per metric name when none is selected", () => {
    const groups = buildMetricDisplayGroups(sampleMetrics, null, null);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.rows).toHaveLength(2);
    expect(groups[0]?.rows.map((r) => r.name)).toEqual([
      "http_requests_total",
      "process_resident_memory_bytes",
    ]);
  });

  it("keeps one aggregated row when a metric is selected", () => {
    const groups = buildMetricDisplayGroups(
      sampleMetrics,
      "http_requests_total",
      null,
    );
    expect(groups[0]?.rows).toHaveLength(1);
    expect(groups[0]?.rows[0]?.series).toHaveLength(2);
  });

  it("aggregates within each split group", () => {
    const groups = buildMetricDisplayGroups(
      sampleMetrics,
      "http_requests_total",
      "method",
    );
    expect(groups).toHaveLength(2);
    expect(groups[0]?.rows).toHaveLength(1);
    expect(groups[0]?.rows[0]?.series).toHaveLength(1);
  });

  it("formats label rows with comma-delimited values", () => {
    const rows = labelValueRows(
      sampleMetrics.filter((m) => m.name === "http_requests_total"),
    );
    expect(rows).toEqual([
      { key: "method", values: "GET, POST" },
      { key: "status", values: "200" },
    ]);
  });

  it("sorts histogram buckets with +Inf last", () => {
    const buckets = sortedHistogramBuckets([
      { le: "+Inf", count: 4 },
      { le: "0.1", count: 2 },
      { le: "0.5", count: 3 },
    ]);
    expect(buckets.map((b) => b.le)).toEqual(["0.1", "0.5", "+Inf"]);
  });

  it("formats histogram stats", () => {
    const text = histogramStatsText({
      name: "latency",
      type: "histogram",
      labels: {},
      buckets: [
        { le: "0.1", count: 2 },
        { le: "+Inf", count: 4 },
      ],
      sum: 0.5,
      count: 4,
    });
    expect(text).toContain("count=4");
    expect(text).toContain("sum=0.5");
    expect(text).toContain("mean=0.125");
  });

  it("sums counter values across series", () => {
    const aggregated = aggregateMetricSeries(
      sampleMetrics.filter((m) => m.name === "http_requests_total"),
    );
    expect(aggregated.value).toBe(14);
  });

  it("merges histogram count, sum, and buckets across series", () => {
    const aggregated = aggregateMetricSeries([
      {
        name: "cron_job_duration_seconds",
        type: "histogram",
        labels: { job_name: "purgeClaudeFiles" },
        buckets: [
          { le: "1", count: 1 },
          { le: "+Inf", count: 1 },
        ],
        sum: 0.057,
        count: 1,
      },
      {
        name: "cron_job_duration_seconds",
        type: "histogram",
        labels: { job_name: "recoverySweep" },
        buckets: [
          { le: "1", count: 1 },
          { le: "+Inf", count: 1 },
        ],
        sum: 0.0553,
        count: 1,
      },
    ]);
    expect(aggregated.count).toBe(2);
    expect(aggregated.sum).toBeCloseTo(0.1123);
    expect(aggregated.buckets).toEqual([
      { le: "1", count: 2 },
      { le: "+Inf", count: 2 },
    ]);
  });
});
