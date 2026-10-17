import { AsyncLocalStorage } from "node:async_hooks";
import { describe, expect, it } from "vitest";
import express, { type Handler } from "express";
import request from "supertest";
import { asOpenApiDocument } from "@saflib/openapi";
import { compileOperationSecurity, type SecurityResolver } from "./security.ts";
import { makeRegisterRoute } from "../register-route.ts";
import { errorHandler } from "./errors.ts";
import { createScopedMiddleware } from "./composition.ts";
import { makeUserHeaders } from "../vitest-helpers.ts";

function opSpec(operation: Record<string, unknown>, method = "get") {
  return asOpenApiDocument({
    openapi: "3.1.0",
    info: { title: "t", version: "1" },
    paths: {
      "/things/{thingId}": {
        [method]: {
          operationId: "getThing",
          parameters: [
            { name: "thingId", in: "path", required: true, schema: { type: "string" } },
          ],
          responses: {
            "200": {
              description: "ok",
              content: { "application/json": { schema: { type: "object" } } },
            },
            "401": { description: "unauthorized", content: { "application/json": { schema: {} } } },
            "403": { description: "forbidden", content: { "application/json": { schema: {} } } },
          },
          ...operation,
        },
      },
    },
  });
}

const teamStorage = new AsyncLocalStorage<{ team: string }>();

/** Product-style resolver with side effects: res.locals + AsyncLocalStorage. */
const teamResolver: SecurityResolver = {
  scopes: ["member", "owner"],
  middleware: (scopes) => [
    (req, res, next) => {
      const team = req.header("x-team");
      if (!team) {
        res.status(403).json({ message: "no team" });
        return;
      }
      if (scopes.includes("owner") && team !== "owned") {
        res.status(403).json({ message: "not owner" });
        return;
      }
      res.locals.team = team;
      teamStorage.enterWith({ team });
      next();
    },
  ],
};

function appFor(operation: Record<string, unknown>) {
  const app = express();
  const registerRoute = makeRegisterRoute({
    securityResolvers: { team: teamResolver },
  });
  const handler: Handler = (_req, res) => {
    res.status(200).json({
      local: res.locals.team ?? null,
      stored: teamStorage.getStore()?.team ?? null,
    });
  };
  registerRoute(app, opSpec(operation), handler);
  app.use(errorHandler);
  return app;
}

describe("compileOperationSecurity", () => {
  it("requires every operation to declare security or x-public", () => {
    expect(() => compileOperationSecurity(opSpec({}))).toThrow(
      /getThing: missing `security`/,
    );
  });

  it("returns no middleware for operations marked x-public", () => {
    expect(compileOperationSecurity(opSpec({ "x-public": true }))).toEqual([]);
    expect(
      compileOperationSecurity(opSpec({ "x-public": true, security: [] })),
    ).toEqual([]);
  });

  it.each([
    [{ security: [{ session: [], nope: [] }] }, /no resolver registered for scheme "nope"/],
    [{ security: [{ session: ["admin"] }] }, /unknown scope "admin" for scheme "session"/],
    [{ security: [{ session: [] }, { session: ["mfa"] }] }, /multiple \(OR\)/],
    [{ security: [{ team: ["member"] }] }, /must include the `session` scheme/],
    [{ security: [] }, /use `x-public: true` for public operations/],
    [{ "x-public": true, security: [{ session: [] }] }, /cannot be combined/],
  ])("fails closed at mount time: %j", (operation, message) => {
    expect(() =>
      compileOperationSecurity(opSpec(operation), { team: teamResolver }),
    ).toThrow(message);
  });
});

describe("makeRegisterRoute with OpenAPI security", () => {
  it("mounts at the spec's method and path", async () => {
    const res = await request(appFor({ "x-public": true })).get("/things/abc");
    expect(res.status).toBe(200);
  });

  it("requires a session for authenticated operations", async () => {
    const res = await request(appFor({ security: [{ session: [] }] })).get(
      "/things/abc",
    );
    expect(res.status).toBe(401);
  });

  it("enforces session scopes", async () => {
    const app = appFor({ security: [{ session: ["mfa"] }] });
    const headers = { ...makeUserHeaders(), "x-user-mfa-completed": "false" };
    const res = await request(app).get("/things/abc").set(headers);
    expect(res.status).toBe(403);
  });

  it("runs product resolvers after session, keeping their context for the handler", async () => {
    const app = appFor({ security: [{ session: [], team: ["member"] }] });

    const missing = await request(app).get("/things/abc").set(makeUserHeaders());
    expect(missing.status).toBe(403);

    const anonymous = await request(app).get("/things/abc").set("x-team", "a");
    expect(anonymous.status).toBe(401);

    const ok = await request(app)
      .get("/things/abc")
      .set({ ...makeUserHeaders(), "x-team": "a" });
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ local: "a", stored: "a" });
  });

  it("passes scopes to product resolvers", async () => {
    const app = appFor({ security: [{ session: [], team: ["owner"] }] });
    const res = await request(app)
      .get("/things/abc")
      .set({ ...makeUserHeaders(), "x-team": "a" });
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "not owner" });
  });

  it("dispatches by operationId for multi-operation specs", async () => {
    const secured = opSpec({ security: [{ session: [], team: ["owner"] }] });
    const multi = asOpenApiDocument({
      ...secured,
      paths: {
        ...secured.paths,
        "/public": {
          get: {
            operationId: "getPublic",
            "x-public": true,
            responses: {
              "200": { description: "ok" },
              "401": { description: "no", content: { "application/json": { schema: {} } } },
            },
          },
        },
      },
    });
    const app = express();
    app.use(
      ...createScopedMiddleware({
        apiSpec: multi,
        securityResolvers: { team: teamResolver },
      }),
    );
    app.get("/things/:thingId", (_req, res) => {
      res.json({ team: res.locals.team });
    });
    app.get("/public", (_req, res) => {
      res.end();
    });
    app.use(errorHandler);

    const notOwner = await request(app)
      .get("/things/abc")
      .set({ ...makeUserHeaders(), "x-team": "a" });
    expect(notOwner.status).toBe(403);

    const owner = await request(app)
      .get("/things/abc")
      .set({ ...makeUserHeaders(), "x-team": "owned" });
    expect(owner.status).toBe(200);
    expect(owner.body).toEqual({ team: "owned" });

    expect((await request(app).get("/public")).status).toBe(200);
  });

  it("rejects multi-operation specs with an undeclared operation at mount time", () => {
    const secured = opSpec({ security: [{ session: [] }] });
    const multi = asOpenApiDocument({
      ...secured,
      paths: {
        ...secured.paths,
        "/undeclared": {
          get: { operationId: "getUndeclared", responses: {} },
        },
      },
    });
    expect(() => createScopedMiddleware({ apiSpec: multi })).toThrow(
      /getUndeclared: missing `security`/,
    );
  });
});
