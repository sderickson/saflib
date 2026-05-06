import http from "node:http";
import { describe, it, expect, vi, afterEach } from "vitest";
import request from "supertest";
import express, { type Express } from "express";
import {
  createErrorMiddleware,
  createInternalMiddleware,
} from "@saflib/express";
import { makePostKratosActionHandler } from "./post-kratos-action.ts";

/**
 * Supertest serializes Buffer bodies as JSON objects; use raw fetch for
 * primitive JSON (`null`, `42`, `"x"`, `[]`) integration checks.
 */
async function postRawJson(
  app: Express,
  urlPath: string,
  rawBody: string,
): Promise<{ status: number; body: Record<string, unknown> }> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", resolve);
  });
  const addr = server.address();
  if (typeof addr === "string" || addr === null) {
    server.close();
    throw new Error("expected tcp listen address");
  }
  try {
    const res = await fetch(`http://127.0.0.1:${addr.port}${urlPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: rawBody,
    });
    const text = await res.text();
    const body = text
      ? (JSON.parse(text) as Record<string, unknown>)
      : {};
    return { status: res.status, body };
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

describe("makePostKratosActionHandler", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 204 and forwards arbitrary JSON object verbatim with request headers", async () => {
    const onAction = vi.fn().mockResolvedValue(undefined);
    const app = express();
    app.use(createInternalMiddleware());
    app.post("/kratos/action", makePostKratosActionHandler({ onAction }));
    app.use(createErrorMiddleware());

    const payload = { flow: { id: "x" }, custom_field: 42 };

    const res = await request(app)
      .post("/kratos/action")
      .send(payload)
      .set("Content-Type", "application/json")
      .set("User-Agent", "test-ua/1")
      .set("Accept-Language", "en-US")
      .set("X-Forwarded-For", "203.0.113.1");

    expect(res.status).toBe(204);
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith({
      body: payload,
      request: {
        userAgent: "test-ua/1",
        acceptLanguage: "en-US",
        forwardedFor: "203.0.113.1",
      },
    });
  });

  it("returns 400 for null JSON body and does not call handler", async () => {
    const onAction = vi.fn();
    const app = express();
    app.use(createInternalMiddleware());
    app.post("/kratos/action", makePostKratosActionHandler({ onAction }));
    app.use(createErrorMiddleware());

    const res = await postRawJson(app, "/kratos/action", "null");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "expected JSON object body" });
    expect(onAction).not.toHaveBeenCalled();
  });

  it("returns 400 for array body and does not call handler", async () => {
    const onAction = vi.fn();
    const app = express();
    app.use(createInternalMiddleware());
    app.post("/kratos/action", makePostKratosActionHandler({ onAction }));
    app.use(createErrorMiddleware());

    const res = await postRawJson(app, "/kratos/action", "[]");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "expected JSON object body" });
    expect(onAction).not.toHaveBeenCalled();
  });

  it("returns 400 for string JSON body and does not call handler", async () => {
    const onAction = vi.fn();
    const app = express();
    app.use(createInternalMiddleware());
    app.post("/kratos/action", makePostKratosActionHandler({ onAction }));
    app.use(createErrorMiddleware());

    const res = await postRawJson(app, "/kratos/action", JSON.stringify("a string"));

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "expected JSON object body" });
    expect(onAction).not.toHaveBeenCalled();
  });

  it("returns 400 for number JSON body and does not call handler", async () => {
    const onAction = vi.fn();
    const app = express();
    app.use(createInternalMiddleware());
    app.post("/kratos/action", makePostKratosActionHandler({ onAction }));
    app.use(createErrorMiddleware());

    const res = await postRawJson(app, "/kratos/action", "42");

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: "expected JSON object body" });
    expect(onAction).not.toHaveBeenCalled();
  });

  it("returns 204 for empty object and invokes handler", async () => {
    const onAction = vi.fn().mockResolvedValue(undefined);
    const app = express();
    app.use(createInternalMiddleware());
    app.post("/kratos/action", makePostKratosActionHandler({ onAction }));
    app.use(createErrorMiddleware());

    const res = await request(app)
      .post("/kratos/action")
      .send({})
      .set("Content-Type", "application/json");

    expect(res.status).toBe(204);
    expect(onAction).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith({
      body: {},
      request: {
        userAgent: undefined,
        acceptLanguage: undefined,
        forwardedFor: undefined,
      },
    });
  });

  it("forwards to error middleware when handler throws", async () => {
    const boom = new Error("boom");
    const onAction = vi.fn().mockRejectedValue(boom);

    const app = express();
    app.use(createInternalMiddleware());
    app.post("/kratos/action", makePostKratosActionHandler({ onAction }));
    app.use(createErrorMiddleware());

    const res = await request(app)
      .post("/kratos/action")
      .send({ flow: { id: "x" } })
      .set("Content-Type", "application/json");

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("boom");
    expect(res.body.status).toBe(500);
  });
});
