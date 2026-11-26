import client from "@prometheus-io/client";
import { describe, expect, it } from "vitest";
import { pickEndpoints, processEndpointStats } from "./endpoint-stats.ts";
import { endpointTiles } from "../digest/tiles.ts";

const stat = (path: string, requests: number, p95_ms: number | null, availability_pct = 100) => ({
  method: "GET",
  path,
  requests,
  p95_ms,
  availability_pct,
});

describe("endpoint stats", () => {
  it("reads per-route p95 and availability from this process's histogram", async () => {
    const registry = new client.Registry();
    const h = new client.Histogram({
      name: "http_request_duration_seconds",
      help: "x",
      labelNames: ["method", "path", "status_code"],
      buckets: [0.1, 1, 5],
      registers: [registry],
    });
    for (let i = 0; i < 30; i++) h.observe({ method: "get", path: "/fast", status_code: "2xx" }, 0.05);
    for (let i = 0; i < 28; i++) h.observe({ method: "post", path: "/slow", status_code: "2xx" }, 2);
    for (let i = 0; i < 2; i++) h.observe({ method: "post", path: "/slow", status_code: "5xx" }, 2);
    for (let i = 0; i < 40; i++) h.observe({ method: "get", path: "unspecified", status_code: "2xx" }, 4);

    const picked = pickEndpoints(await processEndpointStats(registry), "process");
    expect(picked.slowest).toMatchObject({ method: "POST", path: "/slow", requests: 30, p95_ms: 5000 });
    expect(picked.least_available).toMatchObject({ path: "/slow" });
    expect(picked.least_available!.availability_pct).toBeCloseTo(93.33, 1);
  });

  it("ignores routes with too little traffic to judge", () => {
    const picked = pickEndpoints([stat("/rare", 3, 9000, 50), stat("/busy", 100, 200, 100)], "prometheus");
    expect(picked.slowest?.path).toBe("/busy");
    expect(picked.least_available?.path).toBe("/busy");
  });

  it("turns them into rows: yellow over 1s / under 99.5%, red over 3s / under 99%", () => {
    const tiles = (slow: number, avail: number) =>
      endpointTiles({ source: "prometheus", slowest: stat("/a", 100, slow), least_available: stat("/b", 100, null, avail) });
    expect(tiles(400, 100).map((t) => t.tone)).toEqual(["ok", "ok"]);
    expect(tiles(1500, 99.2).map((t) => t.tone)).toEqual(["warn", "warn"]);
    expect(tiles(3500, 98).map((t) => t.tone)).toEqual(["bad", "bad"]);
    expect(tiles(400, 100)[0]).toMatchObject({ label: "Performance", value: "Slowest: GET /a at p95 400 ms", always_show: true, group: "traffic" });
    expect(tiles(400, 98)[1]).toMatchObject({ label: "Reliability", value: "Most errors: GET /b at 2% 5xx" });
    expect(tiles(400, 100)[1]!.value).toBe("No 5xx errors");
    expect(endpointTiles({ source: "process", slowest: null, least_available: null })[0]!.value).toBe("Not enough traffic yet");
  });
});
