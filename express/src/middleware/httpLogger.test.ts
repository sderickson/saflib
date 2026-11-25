import { describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import type { SafReporters } from "@saflib/node";
import { makeRequestLineLogger } from "./httpLogger.ts";

// getSafReporters ignores the request's reporters under NODE_ENV=test, so
// inject them.
let current: SafReporters;
const requestLineLogger = makeRequestLineLogger(() => current);

function appWith(reporters: SafReporters, operationId?: string) {
  const app = express();
  app.use((req, _res, next) => {
    // Stand-in for route matching and context middleware.
    (req as unknown as { openapi: unknown }).openapi = {
      openApiRoute: "/matters/{id}",
      schema: operationId ? { operationId } : {},
    };
    current = reporters;
    next();
  });
  app.use(requestLineLogger);
  app.all("/matters/:id", (_req, res) => {
    res.status(201).json({ ok: true });
  });
  return app;
}

describe("requestLineLogger", () => {
  it("logs one http line per request with the route template, not the path", async () => {
    const http = vi.fn();
    const warn = vi.fn();
    const reporters = { log: { http, warn }, logError: vi.fn() } as unknown as SafReporters;
    await request(appWith(reporters, "getMatter")).get("/matters/secret-id-123").expect(201);
    await vi.waitFor(() => expect(http).toHaveBeenCalledTimes(1));
    const [message, fields] = http.mock.calls[0]!;
    expect(message).toBe("GET /matters/{id}");
    expect(JSON.stringify(fields)).not.toContain("secret-id-123");
    expect(fields).toMatchObject({ method: "GET", route: "/matters/{id}", status: 201, internal: false });
    expect(fields.duration_ms).toBeTypeOf("number");
    expect(warn).not.toHaveBeenCalled();
  });

  it("warns when a changing request has no operation id", async () => {
    const http = vi.fn();
    const warn = vi.fn();
    const reporters = { log: { http, warn }, logError: vi.fn() } as unknown as SafReporters;
    await request(appWith(reporters)).post("/matters/x").expect(201);
    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith("Unknown operation name", expect.any(Object)));
  });
});
