import { describe, it, expect } from "vitest";
import express from "express";
import createError from "http-errors";
import request from "supertest";
import { asOpenApiDocument } from "@saflib/openapi";
import { createOpenApiValidator } from "./openapi.ts";
import { errorHandler } from "./errors.ts";

const spec = asOpenApiDocument({
  openapi: "3.1.0",
  info: { title: "errors-test", version: "0.0.0" },
  paths: {
    "/thing": {
      post: {
        operationId: "postThing",
        responses: {
          "200": {
            description: "ok",
            content: {
              "application/json": {
                schema: { type: "object", properties: {} },
              },
            },
          },
        },
      },
    },
  },
});

function appThrowing(error: Error, validatorMounts: number) {
  const app = express();
  app.use(express.json());
  for (let i = 0; i < validatorMounts; i++) {
    app.use(createOpenApiValidator({ apiSpec: spec }));
  }
  app.post("/thing", () => {
    throw error;
  });
  app.use(errorHandler);
  return app;
}

describe("errorHandler", () => {
  for (const mounts of [1, 2]) {
    it(`keeps the original error when its status isn't in the spec (${mounts} validator mount(s))`, async () => {
      const app = appThrowing(
        createError(422, "Unknown operation_id", { code: "invalid_operation" }),
        mounts,
      );
      const res = await request(app).post("/thing").send({});
      expect(res.headers["content-type"]).toMatch(/json/);
      expect(res.body).toEqual({
        message: "Unknown operation_id",
        status: 422,
        code: "invalid_operation",
      });
    });

    it(`keeps a 500's message (${mounts} validator mount(s))`, async () => {
      const app = appThrowing(new Error("boom"), mounts);
      const res = await request(app).post("/thing").send({});
      expect(res.status).toBe(500);
      expect(res.body).toMatchObject({ message: "boom", status: 500 });
    });
  }
});
