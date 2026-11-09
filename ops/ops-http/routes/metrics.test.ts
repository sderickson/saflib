import { createServer, type IncomingMessage, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createToken, opsDb } from "@saflib/ops-db";
import { throwError } from "@saflib/utils";
import { createApp } from "../http.ts";

/** Stands in for prom-label-proxy: records requests, answers from `reply`. */
let server: Server;
let proxyUrl: string;
let seen: { path: string; params: URLSearchParams; app: string | undefined }[] = [];
let reply: (path: string) => { status: number; body: unknown } = () => ({
  status: 200,
  body: { status: "success", data: { resultType: "vector", result: [] } },
});

beforeAll(async () => {
  server = createServer((req: IncomingMessage, res) => {
    const url = new URL(req.url!, "http://x");
    seen.push({ path: url.pathname, params: url.searchParams, app: req.headers["x-saf-app"] as string });
    const { status, body } = reply(url.pathname);
    res.statusCode = status;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(body));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  proxyUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

async function setup(metrics: boolean = true) {
  const dbKey = opsDb.connect();
  const app = createApp({ dbKey, ...(metrics ? { metrics: { app: "hub", proxyUrl } } : {}) });
  const { token } = await throwError(createToken(dbKey, { name: "t", scopes: ["ops:read"], createdBy: null }));
  seen = [];
  return { app, auth: { authorization: `Bearer ${token}` } };
}

const success = (data: unknown) => ({ status: 200, body: { status: "success", data } });

describe("/ops/metrics", () => {
  it("queries through the label proxy as this app plus host", async () => {
    const { app, auth } = await setup();
    reply = () =>
      success({ resultType: "vector", result: [{ metric: { route: "/x" }, value: [1700000000, "0.25"] }] });
    const res = await request(app)
      .get("/ops/metrics/query")
      .query({ query: "sum(rate(http_requests_total[5m]))", time: "2026-11-09T00:00:00Z" })
      .set(auth)
      .expect(200);
    expect(res.body.metrics).toEqual({
      result_type: "vector",
      result: [{ metric: { route: "/x" }, value: [1700000000, "0.25"] }],
    });
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ path: "/api/v1/query", app: "hub,host" });
    expect(seen[0]!.params.get("query")).toBe("sum(rate(http_requests_total[5m]))");
    expect(seen[0]!.params.get("time")).toBe(String(Date.UTC(2026, 10, 9) / 1000));
  });

  it("enforces range limits before calling Prometheus", async () => {
    const { app, auth } = await setup();
    const range = (start: string, end: string, step?: number) =>
      request(app).get("/ops/metrics/query_range").query({ query: "up", start, end, ...(step ? { step } : {}) }).set(auth);
    expect((await range("2026-11-09T00:00:00Z", "2026-11-08T00:00:00Z")).status).toBe(400);
    expect((await range("2026-09-01T00:00:00Z", "2026-11-09T00:00:00Z", 3600)).body.message).toMatch(/31 days/);
    const tooFine = await range("2026-11-01T00:00:00Z", "2026-11-09T00:00:00Z", 60);
    expect(tooFine.status).toBe(400);
    expect(tooFine.body.message).toMatch(/use step >= \d+/);
    expect((await range("2026-11-08T00:00:00Z", "2026-11-09T00:00:00Z", 30)).status).toBe(400);
    expect(seen).toHaveLength(0);

    reply = () => success({ resultType: "matrix", result: [] });
    await range("2026-11-08T00:00:00Z", "2026-11-09T00:00:00Z").expect(200);
    expect(seen[0]!.params.get("step")).toBe("300");
  });

  it("rejects results with too many series, pointing at aggregation", async () => {
    const { app, auth } = await setup();
    const many = Array.from({ length: 201 }, (_, i) => ({ metric: { i: String(i) }, value: [1, "1"] }));
    reply = () => success({ resultType: "vector", result: many });
    const res = await request(app).get("/ops/metrics/query").query({ query: "up" }).set(auth).expect(400);
    expect(res.body.message).toMatch(/aggregate/);
  });

  it("passes series selectors through whole, commas included", async () => {
    const { app, auth } = await setup();
    reply = () => success([{ __name__: "up", job: "hub" }]);
    const res = await request(app)
      .get("/ops/metrics/series")
      .query({ match: ['up{job="hub",instance=~".+"}'] })
      .set(auth)
      .expect(200);
    expect(res.body.series).toEqual([{ __name__: "up", job: "hub" }]);
    expect(seen[0]!.params.getAll("match[]")).toEqual(['up{job="hub",instance=~".+"}']);
    expect(seen[0]!.params.get("limit")).toBe("201");
  });

  it("maps bad PromQL to 400 and upstream failures to 502", async () => {
    const { app, auth } = await setup();
    reply = () => ({ status: 400, body: { status: "error", errorType: "bad_data", error: "parse error" } });
    const bad = await request(app).get("/ops/metrics/query").query({ query: "sum(" }).set(auth).expect(400);
    expect(bad.body.message).toMatch(/parse error/);
    reply = () => ({ status: 503, body: { status: "error", errorType: "timeout", error: "query timed out" } });
    await request(app).get("/ops/metrics/query").query({ query: "up" }).set(auth).expect(502);
  });

  it("is 404 when metrics are not configured, and needs a token", async () => {
    const { app, auth } = await setup(false);
    await request(app).get("/ops/metrics/query").query({ query: "up" }).set(auth).expect(404);
    await request(app).get("/ops/metrics/query").query({ query: "up" }).expect(401);
  });

  it("accepts timestamps written plainly (unencoded colons), as curl sends them", async () => {
    const { app, auth } = await setup();
    reply = () => success({ resultType: "matrix", result: [] });
    await request(app)
      .get("/ops/metrics/query_range?query=up&start=2026-11-08T00:00:00Z&end=2026-11-09T00:00:00Z")
      .set(auth)
      .expect(200);
    await request(app).get("/ops/digest?since=2026-11-08T00:00:00Z").set(auth).expect(200);
  });
});
