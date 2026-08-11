import { beforeAll, afterAll, describe, it, expect } from "vitest";
import request from "supertest";
import { makeUserHeaders } from "@saflib/express";
import type { __ServiceName__ServiceRequestBody } from "template-package-spec";
import {
  acquireRouterSlimRouteTest,
  releaseSlimRouteTest,
  type SlimRouteTestContext,
} from "../../testing/slim-route-test.ts";
import { create__GroupName__Router } from "./index.ts";

describe("__targetName____GroupName__", () => {
  let ctx: SlimRouteTestContext;

  beforeAll(() => {
    ctx = acquireRouterSlimRouteTest(create__GroupName__Router);
  });

  afterAll(() => {
    releaseSlimRouteTest(ctx.lease);
  });

  // BEGIN ONCE WORKFLOW AREA instructions FOR express/add-handler IF upload
  /*
  For file-upload handlers, send the file with supertest using .attach() instead of .send():

  const fileContent = "test,data\n1,2";
  const response = await request(ctx.app)
    .post("/__group-name__/__target-name__")
    .set(makeUserHeaders())
    .attach("file", Buffer.from(fileContent), "test.csv");

  Consider tests for: success, 401 (no auth), 403 (wrong role), 415 (no file / wrong content-type), 4xx/5xx (invalid file type or validation).
  */
  // END WORKFLOW AREA

  // BEGIN ONCE WORKFLOW AREA instructions FOR express/add-handler IF download
  /*
  For download handlers, assert on binary response: expect(response.headers["content-type"]).toMatch(/.../),
  expect(Buffer.isBuffer(response.body)).toBe(true) or similar. Test success and 401/403/404 as needed.
  */
  // END WORKFLOW AREA

  // TODO: unskip this test
  it.skip("should handle successful requests", async () => {
    const response = await request(ctx.app)
      .post("/__group-name__/__target-name__")
      .set(makeUserHeaders())
      .send({
        // @ts-expect-error - TODO: remove this line as part of workflow
      } satisfies __ServiceName__ServiceRequestBody["__targetName____GroupName__"]);

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
    const response = await request(ctx.app)
      .post("/__group-name__/__target-name__")
      .set(makeUserHeaders())
      .send({
        // ...
      });

    expect(response.status).toBe(409); // or other 4xx status code
    // Don't assert on response.body.message
  });
});
