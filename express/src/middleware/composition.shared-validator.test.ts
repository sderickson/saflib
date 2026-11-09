import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import { asOpenApiDocument } from "@saflib/openapi";
import { sliceOperationById } from "@saflib/openapi/slice-operation";
import { createScopedMiddleware } from "./composition.ts";
import { errorHandler } from "./errors.ts";

const responses = {
  "200": {
    description: "ok",
    content: { "application/json": { schema: { type: "object" } } },
  },
  "400": {
    description: "bad",
    content: { "application/json": { schema: {} } },
  },
};

const doc = asOpenApiDocument({
  openapi: "3.1.0",
  info: { title: "t", version: "1" },
  paths: {
    "/cats": {
      post: {
        operationId: "createCat",
        "x-public": true,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["meow"],
                properties: { meow: { type: "string" } },
              },
            },
          },
        },
        responses,
      },
    },
    "/dogs": {
      post: {
        operationId: "createDog",
        "x-public": true,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["woof"],
                properties: { woof: { type: "string" } },
              },
            },
          },
        },
        responses,
      },
    },
  },
});

function app() {
  const app = express();
  app.use(express.json());
  const ok: express.Handler = (req, res) => {
    res.status(200).json({ operationId: req.openapi?.schema.operationId });
  };
  app.post(
    "/cats",
    ...createScopedMiddleware({
      apiSpec: sliceOperationById(doc, "createCat"),
    }),
    ok,
  );
  app.post(
    "/dogs",
    ...createScopedMiddleware({
      apiSpec: sliceOperationById(doc, "createDog"),
    }),
    ok,
  );
  app.use(errorHandler);
  return app;
}

describe("createScopedMiddleware with slices of one document", () => {
  it("validates each route against its own operation", async () => {
    const server = app();
    await request(server)
      .post("/cats")
      .send({ meow: "hi" })
      .expect(200, { operationId: "createCat" });
    await request(server).post("/cats").send({ woof: "hi" }).expect(400);
    await request(server)
      .post("/dogs")
      .send({ woof: "hi" })
      .expect(200, { operationId: "createDog" });
    await request(server).post("/dogs").send({ meow: "hi" }).expect(400);
  });

  it("doesn't modify the original document", async () => {
    const before = JSON.stringify(doc);
    await request(app()).post("/cats").send({ meow: "hi" }).expect(200);
    expect(JSON.stringify(doc)).toBe(before);
  });
});
