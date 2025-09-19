import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
// @ts-expect-error - TODO: remove this line as part of workflow
import { createServiceNameHttpApp } from "../../http.ts";
import { makeUserHeaders } from "@saflib/express";
import type { ServiceNameServiceRequestBody } from "@template/file-spec";

describe("operationId", () => {
  let app: express.Express;

  beforeEach(() => {
    app = createServiceNameHttpApp({});
  });

  // TODO: unskip this test
  it.skip("should handle successful requests", async () => {
    const response = await request(app)
      .post("/resource-name/template-file")
      .set(makeUserHeaders())
      .send({
        // @ts-expect-error - TODO: remove this line as part of workflow
      } satisfies ServiceNameServiceRequestBody["operationId"]);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      // TODO: Add expected response structure
      // Focus on identifiers and important data fields
      // Avoid asserting on fields that might change frequently
      // Use expect.any(...) for fields which change with each test
    });
  });

  // TODO: unskip this test
  it.skip("should return 4xx for ...", async () => {
    // make a request which will return the targeted error
    const response = await request(app)
      .post("/resource-name/template-file")
      .set(makeUserHeaders())
      .send({
        // ...
      });

    expect(response.status).toBe(409); // or other 4xx status code
    // Don't assert on response.body.message
  });
});
