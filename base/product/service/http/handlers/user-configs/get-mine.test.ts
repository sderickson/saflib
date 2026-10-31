import { beforeAll, afterAll, describe, it, expect, assert } from "vitest";
import request from "supertest";
import { makeUserHeaders } from "@saflib/express";
import {
  acquireRouterSlimRouteTest,
  releaseSlimRouteTest,
  type SlimRouteTestContext,
} from "#test/slim-route-test.ts";
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
    expect(response.body.user_config).toMatchObject({
      user_id: userId,
      display_name: "",
      marketing_emails_opt_in: false,
      marketing_emails_opt_in_at: null,
      terms_of_service_agreed_at: null,
    });
  });

  it("PUT /user-configs/mine updates display name", async () => {
    const response = await request(ctx.app)
      .put("/user-configs/mine")
      .set(makeUserHeaders(userId))
      .send({
        display_name: "Alex Rivera",
        marketing_emails_opt_in: true,
      });

    expect(response.status).toBe(200);
    assert(response.body.user_config);
    expect(response.body.user_config.display_name).toBe("Alex Rivera");
    expect(response.body.user_config.marketing_emails_opt_in).toBe(true);
    expect(response.body.user_config.marketing_emails_opt_in_at).toEqual(
      expect.any(String),
    );
  });

  it("PUT rejects empty display_name", async () => {
    const response = await request(ctx.app)
      .put("/user-configs/mine")
      .set(makeUserHeaders(userId))
      .send({
        display_name: "   ",
        marketing_emails_opt_in: false,
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
