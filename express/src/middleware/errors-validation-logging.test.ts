import { afterEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";
import { getSafReporters } from "@saflib/node";
import { asOpenApiDocument } from "@saflib/openapi";
import { createOpenApiValidator } from "./openapi.ts";
import { errorHandler } from "./errors.ts";

// Shaped like a questionnaire save: a map of answers whose values must be
// strings or booleans.
const spec = asOpenApiDocument({
  openapi: "3.1.0",
  info: { title: "validation-logging-test", version: "0.0.0" },
  paths: {
    "/answers": {
      put: {
        operationId: "putAnswers",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  answers: {
                    type: "object",
                    additionalProperties: {
                      oneOf: [{ type: "string" }, { type: "boolean" }],
                    },
                  },
                },
                required: ["answers"],
              },
            },
          },
        },
        responses: { "200": { description: "ok" } },
      },
    },
  },
});

function app() {
  const a = express();
  a.use(express.json());
  a.use(createOpenApiValidator({ apiSpec: spec }));
  a.put("/answers", (_req, res) => {
    res.status(200).end();
  });
  a.use(errorHandler);
  return a;
}

describe("errorHandler request-validation logging", () => {
  afterEach(() => vi.restoreAllMocks());

  it("logs which request paths failed and their types, never the values", async () => {
    const warn = vi.spyOn(getSafReporters().log, "warn");
    const res = await request(app())
      .put("/answers")
      .send({
        answers: {
          ok: "fine",
          cleared: null,
          wrapped: { value: "SECRET-ANSWER" },
        },
      });

    expect(res.status).toBe(400);
    expect(warn).toHaveBeenCalledTimes(1);
    const [message, meta] = warn.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ];
    expect(message).toBe("request failed validation");
    expect(meta).toMatchObject({
      operation: "putAnswers",
      method: "PUT",
      status: 400,
    });
    const issues = meta.issues as { path: string; submitted_type?: string }[];
    // The validator stops at the first bad property; each branch of the
    // oneOf is listed.
    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "/body/answers/cleared",
          message: "must match exactly one schema in oneOf",
          submitted_type: "null",
        }),
      ]),
    );
    expect(issues.some((issue) => issue.path === "/body/answers/ok")).toBe(
      false,
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain("SECRET-ANSWER");
  });

  it("reports an object where a leaf was expected as type object, without its contents", async () => {
    const warn = vi.spyOn(getSafReporters().log, "warn");
    await request(app())
      .put("/answers")
      .send({ answers: { wrapped: { value: "SECRET-ANSWER" } } });
    const [, meta] = warn.mock.calls[0] as unknown as [
      string,
      Record<string, unknown>,
    ];
    expect(meta.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "/body/answers/wrapped",
          submitted_type: "object",
        }),
      ]),
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain("SECRET-ANSWER");
  });

  it("stays quiet for the validator's 404s", async () => {
    const warn = vi.spyOn(getSafReporters().log, "warn");
    const res = await request(app()).put("/nope").send({});
    expect(res.status).toBe(404);
    expect(warn).not.toHaveBeenCalled();
  });
});
