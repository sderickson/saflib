import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { createToken, getOrCreateSigningKey, opsDb, revokeGraphKey } from "@saflib/ops-db";
import { throwError } from "@saflib/utils";
import { createApp } from "../http.ts";

let server: Server;
let proxyUrl: string;
let lastApp: string | undefined;

beforeAll(async () => {
  server = createServer((req, res) => {
    lastApp = req.headers["x-saf-app"] as string;
    const url = new URL(req.url!, "http://x");
    const start = Number(url.searchParams.get("start"));
    res.setHeader("content-type", "application/json");
    res.end(
      JSON.stringify({
        status: "success",
        data: {
          resultType: "matrix",
          result: [
            { metric: { route: "/ops/health" }, values: [[start, "0.01"], [start + 300, "0.02"]] },
          ],
        },
      }),
    );
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  proxyUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

async function setup() {
  const dbKey = opsDb.connect();
  const app = createApp({ dbKey, metrics: { app: "hub", proxyUrl } });
  const { token } = await throwError(createToken(dbKey, { name: "t", scopes: ["ops:read"], createdBy: null }));
  return { dbKey, app, auth: { authorization: `Bearer ${token}` } };
}

/** Path and query of a minted URL, for supertest. */
const pathOf = (url: string) => {
  const u = new URL(url);
  return `${u.pathname}${u.search}`;
};

describe("graph links", () => {
  it("mints signed links that render without a token", async () => {
    const { app, auth } = await setup();
    const minted = await request(app)
      .post("/ops/metrics/graph-links")
      .set(auth)
      .send({
        query: "histogram_quantile(0.95, sum by (le, route) (rate(http_request_duration_seconds_bucket[5m])))",
        start: "2026-11-08T00:00:00Z",
        end: "2026-11-09T00:00:00Z",
        title: "p95 by route",
      })
      .expect(200);
    const link = minted.body.graph_link;
    expect(link).toMatchObject({ start: "2026-11-08T00:00:00.000Z", end: "2026-11-09T00:00:00.000Z", step: 300 });
    expect(link.svg_url).toMatch(/^http:\/\/127\.0\.0\.1(:\d+)?\/ops\/metrics\/graph\.svg\?/);

    const svg = await request(app).get(pathOf(link.svg_url)).buffer(true).expect(200);
    const svgText = svg.text ?? Buffer.from(svg.body).toString();
    expect(svg.headers["content-type"]).toMatch(/^image\/svg\+xml/);
    expect(svg.headers["cache-control"]).toMatch(/immutable/);
    expect(svgText).toContain("p95 by route");
    expect(svgText).toContain("route=/ops/health");
    expect(lastApp).toBe("hub,host");

    const png = await request(app).get(pathOf(link.png_url)).buffer(true).expect(200);
    expect(png.headers["content-type"]).toBe("image/png");
    expect((png.body as Buffer).subarray(1, 4).toString()).toBe("PNG");
  });

  it("refuses links whose parameters were changed", async () => {
    const { app, auth } = await setup();
    const { body } = await request(app).post("/ops/metrics/graph-links").set(auth).send({ query: "up" }).expect(200);
    const url = new URL(body.graph_link.svg_url);
    for (const [k, v] of [["q", "node_load1"], ["start", String(Number(url.searchParams.get("start")) - 86400)], ["title", "x"]]) {
      const params = new URLSearchParams(url.search);
      params.set(k!, v!);
      const qs = [...params].map(([pk, pv]) => `${pk}=${encodeURIComponent(pv)}`).join("&");
      await request(app).get(`${url.pathname}?${qs}`).expect(403);
    }
  });

  it("stops rendering links when their key is revoked", async () => {
    const { dbKey, app, auth } = await setup();
    const { body } = await request(app).post("/ops/metrics/graph-links").set(auth).send({ query: "up" }).expect(200);
    await request(app).get(pathOf(body.graph_link.svg_url)).expect(200);
    const key = await throwError(getOrCreateSigningKey(dbKey));
    await throwError(revokeGraphKey(dbKey, key.id));
    await request(app).get(pathOf(body.graph_link.svg_url)).expect(403);
  });

  it("applies range limits when minting, and requires a token", async () => {
    const { app, auth } = await setup();
    await request(app)
      .post("/ops/metrics/graph-links")
      .set(auth)
      .send({ query: "up", start: "2026-08-01T00:00:00Z", end: "2026-11-09T00:00:00Z" })
      .expect(400);
    await request(app).post("/ops/metrics/graph-links").send({ query: "up" }).expect(401);
  });
});
