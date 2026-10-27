import { describe, expect, it } from "vitest";
import express, { type Handler } from "express";
import request from "supertest";
import { readdirSync } from "fs";
import { tmpdir } from "os";
import { asOpenApiDocument } from "@saflib/openapi";
import { createScopedMiddleware, splitAtMultipart } from "./composition.ts";
import { errorHandler } from "./errors.ts";
import { uploadToDiskOptions } from "./multer.ts";
import { makeUserHeaders } from "../vitest-helpers.ts";

function uploadSpec(access: Record<string, unknown>) {
  return asOpenApiDocument({
    openapi: "3.1.0",
    info: { title: "t", version: "1" },
    paths: {
      "/things/{thingId}/files": {
        post: {
          operationId: "uploadThingFile",
          ...access,
          parameters: [
            { name: "thingId", in: "path", required: true, schema: { type: "string" } },
          ],
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["file"],
                  properties: { file: { type: "string", format: "binary" } },
                },
              },
            },
          },
          responses: {
            "200": { description: "ok", content: { "application/json": { schema: { type: "object" } } } },
            "400": { description: "bad", content: { "application/json": { schema: {} } } },
            "401": { description: "unauthorized", content: { "application/json": { schema: {} } } },
          },
        },
      },
    },
  });
}

function appFor(access: Record<string, unknown>) {
  const app = express();
  const handler: Handler = (req, res) => {
    const files = (req.files as Express.Multer.File[] | undefined) ?? [];
    res.status(200).json({ names: files.map((file) => file.originalname) });
  };
  app.post(
    "/things/:thingId/files",
    ...createScopedMiddleware({ apiSpec: uploadSpec(access), fileUploader: uploadToDiskOptions }),
    handler,
  );
  app.use(errorHandler);
  return app;
}

const tempUploadsNamed = (marker: string) =>
  readdirSync(tmpdir()).filter((name) => name.includes(marker));

describe("createScopedMiddleware with uploads", () => {
  it("rejects anonymous uploads before multer writes them", async () => {
    let wrote = false;
    const watch = setInterval(() => {
      wrote ||= tempUploadsNamed("anon-upload-probe").length > 0;
    }, 1);
    await request(appFor({ security: [{ session: [] }] }))
      .post("/things/1/files")
      .attach("file", Buffer.alloc(1024 * 1024, 1), "anon-upload-probe.bin")
      .expect(401);
    clearInterval(watch);

    expect(wrote).toBe(false);
    expect(tempUploadsNamed("anon-upload-probe")).toEqual([]);
  });

  it("parses and validates uploads once access is granted", async () => {
    const app = appFor({ security: [{ session: [] }] });
    const ok = await request(app)
      .post("/things/1/files")
      .set(makeUserHeaders())
      .attach("file", Buffer.from("hello"), "allowed.txt")
      .expect(200);
    expect(ok.body).toEqual({ names: ["allowed.txt"] });

    await request(app)
      .post("/things/1/files")
      .set(makeUserHeaders())
      .field("note", "no file")
      .expect(400);
  });

  it("still accepts x-public uploads anonymously", async () => {
    await request(appFor({ "x-public": true }))
      .post("/things/1/files")
      .attach("file", Buffer.from("hello"), "public.txt")
      .expect(200);
  });
});

describe("splitAtMultipart", () => {
  it("fails loudly if the validator has no multipart step", () => {
    const matchRoute: Handler = (_req, _res, next) => next();
    expect(() => splitAtMultipart([matchRoute])).toThrow(/multipartMiddleware/);
  });
});
