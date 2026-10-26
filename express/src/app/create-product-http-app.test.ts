import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createProductHttpApp } from "./create-product-http-app.ts";
import { createRouteTestApp } from "../test/route-test-app.ts";

const pingRouter = () => {
  const router = express.Router();
  router.get("/ping", (_req, res) => {
    res.json({ ok: true });
  });
  return router;
};

describe("createProductHttpApp", () => {
  it("gates non-public routes and runs stages in order", async () => {
    const seen: string[] = [];
    const app = createProductHttpApp({
      mounts: [{ kind: "router", createRouter: pingRouter }],
      isPublicRoute: (req) => req.path === "/ping" && req.query.open === "1",
      runInContext: (next) => {
        seen.push("context");
        next();
      },
      beforeIdentity: [
        (_req, _res, next) => {
          seen.push("beforeIdentity");
          next();
        },
      ],
      afterAuth: [
        (_req, _res, next) => {
          seen.push("afterAuth");
          next();
        },
      ],
    });

    expect((await request(app).get("/ping")).status).toBe(401);
    expect(seen).toEqual(["context", "beforeIdentity"]);

    seen.length = 0;
    const open = await request(app).get("/ping?open=1");
    expect(open.status).toBe(200);
    expect(open.body).toEqual({ ok: true });
    expect(seen).toEqual(["context", "beforeIdentity", "afterAuth"]);
  });

  it("returns JSON 404s for unknown routes", async () => {
    const app = createProductHttpApp({ mounts: [], isPublicRoute: () => true });
    const res = await request(app).get("/nope");
    expect(res.status).toBe(404);
    expect(res.body.status).toBe(404);
  });
});

describe("createRouteTestApp", () => {
  it("mounts only the given routers", async () => {
    const app = createRouteTestApp({
      routers: [pingRouter],
      isPublicRoute: () => true,
    });
    expect((await request(app).get("/ping")).body).toEqual({ ok: true });
    expect((await request(app).get("/other")).status).toBe(404);
  });
});

describe("publicRouteMatcher", () => {
  it("matches x-public operations by method and path template", async () => {
    const { publicRouteMatcher } = await import("./public-routes.ts");
    const matches = publicRouteMatcher([
      {
        openapi: "3.1.0",
        info: { title: "t", version: "1" },
        paths: {
          "/things/{id}/open": {
            post: { "x-public": true, responses: {} },
            get: { responses: {} },
          },
        },
      } as never,
    ]);
    const req = (method: string, path: string) =>
      ({ method, path }) as Parameters<typeof matches>[0];
    expect(matches(req("POST", "/things/abc/open"))).toBe(true);
    expect(matches(req("OPTIONS", "/things/abc/open"))).toBe(true);
    expect(matches(req("GET", "/things/abc/open"))).toBe(false);
    expect(matches(req("POST", "/things/abc/open/extra"))).toBe(false);
  });
});
