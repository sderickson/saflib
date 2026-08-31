import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { asOpenApiDocument } from "@saflib/openapi";
import { createOpenApiValidator } from "./openapi.ts";
import { errorHandler } from "./errors.ts";

/**
 * Smoke: express-openapi-validator against OpenAPI 3.1 nullability.
 * Agents write `type: [T, "null"]` / `oneOf: [null, $ref]` naturally; 3.0 forbids them.
 */
const openApi31SmokeSpec = asOpenApiDocument({
  openapi: "3.1.0",
  info: { title: "oas-3.1-smoke", version: "0.0.0" },
  paths: {
    "/smoke": {
      post: {
        operationId: "smokeNullable",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  nickname: {
                    type: ["string", "null"],
                    maxLength: 40,
                  },
                  mailingAddress: {
                    oneOf: [
                      { type: "null" },
                      { $ref: "#/components/schemas/FlatAddress" },
                    ],
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "echo",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  additionalProperties: false,
                  required: ["ok"],
                  properties: {
                    ok: { type: "boolean" },
                    nickname: { type: ["string", "null"] },
                    mailingAddress: {
                      oneOf: [
                        { type: "null" },
                        { $ref: "#/components/schemas/FlatAddress" },
                      ],
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      FlatAddress: {
        type: "object",
        additionalProperties: false,
        properties: {
          street: { type: ["string", "null"] },
          city: { type: "string" },
        },
      },
    },
  },
});

describe("OpenAPI 3.1 nullability (express-openapi-validator smoke)", () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use(createOpenApiValidator({ apiSpec: openApi31SmokeSpec }));
    app.post("/smoke", (req, res) => {
      res.status(200).json({
        ok: true,
        nickname: req.body.nickname ?? null,
        mailingAddress: req.body.mailingAddress ?? null,
      });
    });
    app.use(errorHandler);
  });

  it("accepts null scalars and null $ref objects on request", async () => {
    const response = await request(app)
      .post("/smoke")
      .send({ nickname: null, mailingAddress: null });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: true,
      nickname: null,
      mailingAddress: null,
    });
  });

  it("accepts populated nullable $ref objects", async () => {
    const response = await request(app)
      .post("/smoke")
      .send({
        nickname: "Ada",
        mailingAddress: { street: null, city: "Portland" },
      });

    expect(response.status).toBe(200);
    expect(response.body.mailingAddress).toEqual({
      street: null,
      city: "Portland",
    });
  });

  it("still rejects wrong types", async () => {
    const response = await request(app)
      .post("/smoke")
      .send({ nickname: 42 });

    expect(response.status).toBeGreaterThanOrEqual(400);
  });
});
