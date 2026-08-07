import { describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import type { ChangeEmitter, ChangeEvent } from "@saflib/notify";
import { createChangeEventMiddleware } from "./changeEvent.ts";

function mockEmitter() {
  const published: ChangeEvent[] = [];
  const emitter: ChangeEmitter = {
    publish: vi.fn((event: ChangeEvent) => {
      published.push(event);
    }),
    subscribe: vi.fn(() => () => {}),
    getEventsAfter: vi.fn(() => []),
  };
  return { emitter, published };
}

function buildApp(options: {
  emitter: ChangeEmitter;
  getOrgId?: (req: express.Request) => string | undefined | null;
  skipOperationIds?: ReadonlySet<string> | readonly string[];
  method?: "get" | "post" | "patch" | "delete";
  status?: number;
  /** Defaults to `updateMatter`. Pass `null` to omit openapi.schema.operationId. */
  operationId?: string | null;
  routePath?: string;
}) {
  const app = express();
  app.use(
    createChangeEventMiddleware({
      emitter: options.emitter,
      getOrgId: options.getOrgId ?? (() => "org-1"),
      skipOperationIds: options.skipOperationIds,
    }),
  );

  const method = options.method ?? "post";
  const routePath = options.routePath ?? "/matters/:matterId";
  const status = options.status ?? 200;
  const operationId =
    options.operationId === null
      ? undefined
      : (options.operationId ?? "updateMatter");

  app[method](routePath, (req, res) => {
    if (operationId !== undefined) {
      req.openapi = {
        schema: { operationId },
      } as express.Request["openapi"];
    }
    res.status(status).json({ ok: true });
  });

  return app;
}

describe("createChangeEventMiddleware", () => {
  it("publishes on 2xx POST with operationId, params, and orgId", async () => {
    const { emitter, published } = mockEmitter();
    const app = buildApp({
      emitter,
      method: "post",
      status: 200,
      routePath: "/matters/:matterId",
    });

    await request(app).post("/matters/m-42").expect(200);

    expect(emitter.publish).toHaveBeenCalledTimes(1);
    expect(published[0]).toEqual({
      operationId: "updateMatter",
      params: { matterId: "m-42" },
      orgId: "org-1",
    });
  });

  it("publishes on 2xx PATCH and DELETE", async () => {
    const { emitter: patchEmitter, published: patchPublished } = mockEmitter();
    const patchApp = buildApp({
      emitter: patchEmitter,
      method: "patch",
      operationId: "patchThing",
    });
    await request(patchApp).patch("/matters/a").expect(200);
    expect(patchPublished[0]?.operationId).toBe("patchThing");

    const { emitter: deleteEmitter, published: deletePublished } =
      mockEmitter();
    const deleteApp = buildApp({
      emitter: deleteEmitter,
      method: "delete",
      operationId: "deleteThing",
    });
    await request(deleteApp).delete("/matters/a").expect(200);
    expect(deletePublished[0]?.operationId).toBe("deleteThing");
  });

  it("skips GET requests", async () => {
    const { emitter } = mockEmitter();
    const app = buildApp({ emitter, method: "get" });

    await request(app).get("/matters/m-1").expect(200);

    expect(emitter.publish).not.toHaveBeenCalled();
  });

  it("skips non-2xx responses", async () => {
    const { emitter } = mockEmitter();
    const app = buildApp({ emitter, status: 400 });

    await request(app).post("/matters/m-1").expect(400);

    expect(emitter.publish).not.toHaveBeenCalled();
  });

  it("skips when operationId is missing", async () => {
    const { emitter } = mockEmitter();
    const app = buildApp({ emitter, operationId: null });

    await request(app).post("/matters/m-1").expect(200);

    expect(emitter.publish).not.toHaveBeenCalled();
  });

  it("skips configured skipOperationIds", async () => {
    const { emitter } = mockEmitter();
    const app = buildApp({
      emitter,
      skipOperationIds: ["cspViolations"],
      operationId: "cspViolations",
    });

    await request(app).post("/matters/m-1").expect(200);

    expect(emitter.publish).not.toHaveBeenCalled();
  });

  it("skips when getOrgId returns empty", async () => {
    const { emitter } = mockEmitter();
    const app = buildApp({
      emitter,
      getOrgId: () => undefined,
    });

    await request(app).post("/matters/m-1").expect(200);

    expect(emitter.publish).not.toHaveBeenCalled();
  });

  it("accepts skipOperationIds as a Set", async () => {
    const { emitter } = mockEmitter();
    const app = buildApp({
      emitter,
      skipOperationIds: new Set(["noisyOp"]),
      operationId: "noisyOp",
    });

    await request(app).post("/matters/m-1").expect(200);

    expect(emitter.publish).not.toHaveBeenCalled();
  });
});
