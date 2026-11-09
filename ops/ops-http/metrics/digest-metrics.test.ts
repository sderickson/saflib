import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { digestMetrics } from "./digest-metrics.ts";

/** Answers each query from `values`, keyed by what the query asks for. */
let server: Server;
let proxyUrl: string;
let values: Record<string, string | undefined> = {};

function keyFor(query: string): string {
  const prev = query.includes("offset") ? "prev_" : "";
  if (query.startsWith("histogram_quantile")) return `${prev}p95`;
  if (query.includes('status_code="5xx"')) return `${prev}errors`;
  return `${prev}requests`;
}

beforeAll(async () => {
  server = createServer((req, res) => {
    const query = new URL(req.url!, "http://x").searchParams.get("query")!;
    const v = values[keyFor(query)];
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        status: "success",
        data: { resultType: "vector", result: v === undefined ? [] : [{ metric: {}, value: [0, v] }] },
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  proxyUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

const now = new Date("2026-11-09T12:00:00Z");
const since = new Date("2026-11-08T12:00:00Z");
const run = () => digestMetrics({ app: "hub", proxyUrl }, since, now);

describe("digestMetrics", () => {
  it("compares the window with the previous one and stays quiet when normal", async () => {
    values = { requests: "1000", errors: "2", p95: "0.12", prev_requests: "900", prev_errors: "3", prev_p95: "0.1" };
    const m = await run();
    expect(m).toMatchObject({
      window_seconds: 86400,
      requests: { current: 1000, previous: 900 },
      error_rate: { current: 0.002, previous: 3 / 900 },
      p95_seconds: { current: 0.12, previous: 0.1 },
      flags: [],
      error: null,
    });
  });

  it("flags high and rising error rates, and a doubled slow p95", async () => {
    values = { requests: "100", errors: "8", p95: "1.2", prev_requests: "100", prev_errors: "1", prev_p95: "0.4" };
    expect((await run()).flags).toEqual(["error_rate_high", "p95_up"]);
    values = { requests: "100", errors: "2", prev_requests: "100", prev_errors: "0" };
    expect((await run()).flags).toEqual(["error_rate_up"]);
  });

  it("ignores error rates on too little traffic, and missing data", async () => {
    values = { requests: "10", errors: "5" };
    const m = await run();
    expect(m.flags).toEqual([]);
    expect(m.p95_seconds).toEqual({ current: null, previous: null });
    expect(m.requests.previous).toBeNull();
  });

  it("reports an unreachable Prometheus instead of throwing", async () => {
    const m = await digestMetrics({ app: "hub", proxyUrl: "http://127.0.0.1:1" }, since, now);
    expect(m.error).toMatch(/unreachable/);
    expect(m.flags).toEqual([]);
  });
});
