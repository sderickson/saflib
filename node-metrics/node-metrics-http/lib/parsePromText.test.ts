import { describe, it, expect } from "vitest";
import { parsePromText } from "./parsePromText.ts";

describe("parsePromText", () => {
  it("parses counters and gauges with labels", () => {
    const text = `
# HELP http_requests_total Total HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 42
# TYPE process_resident_memory_bytes gauge
process_resident_memory_bytes 1234567
`.trim();

    const metrics = parsePromText(text);
    expect(metrics).toEqual([
      {
        name: "http_requests_total",
        type: "counter",
        help: "Total HTTP requests",
        labels: { method: "GET", status: "200" },
        value: 42,
      },
      {
        name: "process_resident_memory_bytes",
        type: "gauge",
        labels: {},
        value: 1234567,
      },
    ]);
  });

  it("parses histogram bucket, sum, and count into one series", () => {
    const text = `
# HELP http_request_duration_seconds Request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1",method="GET"} 5
http_request_duration_seconds_bucket{le="0.3",method="GET"} 8
http_request_duration_seconds_bucket{le="+Inf",method="GET"} 10
http_request_duration_seconds_sum{method="GET"} 1.23
http_request_duration_seconds_count{method="GET"} 10
`.trim();

    const metrics = parsePromText(text);
    expect(metrics).toHaveLength(1);
    expect(metrics[0]).toMatchObject({
      name: "http_request_duration_seconds",
      type: "histogram",
      help: "Request duration",
      labels: { method: "GET" },
      sum: 1.23,
      count: 10,
      buckets: [
        { le: "0.1", count: 5 },
        { le: "0.3", count: 8 },
        { le: "+Inf", count: 10 },
      ],
    });
  });

  it("ignores unknown lines and empty input", () => {
    expect(parsePromText("")).toEqual([]);
    expect(parsePromText("not a metric line")).toEqual([]);
  });
});
