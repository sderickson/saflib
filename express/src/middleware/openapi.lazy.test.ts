import { describe, expect, it } from "vitest";
import express from "express";
import request from "supertest";
import * as OpenApiValidator from "express-openapi-validator";
import { asOpenApiDocument } from "@saflib/openapi";
import { createOpenApiValidator } from "./openapi.ts";
import { errorHandler } from "./errors.ts";

// express-openapi-validator records the instance each `middleware()` call
// creates here, which shows whether the real chain has been built yet.
const lastBuilt = OpenApiValidator.middleware as unknown as { _oav?: unknown };

function makeDoc() {
  return asOpenApiDocument({
    openapi: "3.1.0",
    info: { title: "t", version: "1" },
    paths: {
      "/cats": {
        post: {
          operationId: "createCat",
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
          responses: {
            "200": {
              description: "ok",
              content: { "application/json": { schema: { type: "object" } } },
            },
            "400": {
              description: "bad",
              content: { "application/json": { schema: {} } },
            },
          },
        },
      },
    },
  });
}

describe("createOpenApiValidator", () => {
  it("builds the validator on the first request, not when mounted", async () => {
    lastBuilt._oav = undefined;
    const chain = createOpenApiValidator({ apiSpec: makeDoc() });
    expect(chain.map((handler) => handler.name)).toContain(
      "multipartMiddleware",
    );
    expect(lastBuilt._oav).toBeUndefined();

    const app = express();
    app.use(express.json());
    app.post(
      "/cats",
      ...(chain as unknown as express.Handler[]),
      (_req, res) => {
        res.json({});
      },
    );
    app.use(errorHandler);

    await request(app).post("/cats").send({ meow: "hi" }).expect(200);
    const built = lastBuilt._oav;
    expect(built).toBeDefined();

    await request(app).post("/cats").send({ woof: "hi" }).expect(400);
    expect(lastBuilt._oav).toBe(built);
  });
});
