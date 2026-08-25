import { beforeAll, afterAll, describe, it, expect, assert } from "vitest";
import request from "supertest";
import { makeUserHeaders } from "@saflib/express";
import {
  acquireRouterSlimRouteTest,
  releaseSlimRouteTest,
  type SlimRouteTestContext,
} from "../../testing/slim-route-test.ts";
import { createUserConfigsRouter } from "./index.ts";

describe("user-configs", () => {
  let ctx: SlimRouteTestContext;
  const userId = "user-config-test-1";

  beforeAll(() => {
    ctx = acquireRouterSlimRouteTest(createUserConfigsRouter);
  });

  afterAll(() => {
    releaseSlimRouteTest(ctx.lease);
  });

  it("GET /user-configs/mine lazy-creates and returns defaults", async () => {
    const response = await request(ctx.app)
      .get("/user-configs/mine")
      .set(makeUserHeaders(userId));

    expect(response.status).toBe(200);
    expect(response.body.userConfig).toMatchObject({
      userId,
      displayName: "",
      marketingEmailsOptIn: false,
      marketingEmailsOptInAt: null,
      termsOfServiceAgreedAt: null,
    });
  });

  it("PUT /user-configs/mine updates display name", async () => {
    const response = await request(ctx.app)
      .put("/user-configs/mine")
      .set(makeUserHeaders(userId))
      .send({
        displayName: "Alex Rivera",
        marketingEmailsOptIn: true,
      });

    expect(response.status).toBe(200);
    assert(response.body.userConfig);
    expect(response.body.userConfig.displayName).toBe("Alex Rivera");
    expect(response.body.userConfig.marketingEmailsOptIn).toBe(true);
    expect(response.body.userConfig.marketingEmailsOptInAt).toEqual(
      expect.any(String),
    );
  });

  it("PUT rejects empty displayName", async () => {
    const response = await request(ctx.app)
      .put("/user-configs/mine")
      .set(makeUserHeaders(userId))
      .send({
        displayName: "   ",
        marketingEmailsOptIn: false,
      });

    expect(response.status).toBe(400);
  });

  it("POST unsubscribe always returns 200", async () => {
    const response = await request(ctx.app)
      .post("/user-configs/unsubscribe-marketing")
      .send({ email: "unknown@example.com" });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({});
  });
});
