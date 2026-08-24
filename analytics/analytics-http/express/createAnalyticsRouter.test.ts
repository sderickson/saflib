import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import {
  createErrorMiddleware,
  makeAdminHeaders,
} from "@saflib/express";
import {
  listProductEvents,
  recordProductEvent,
  resetProductEventBufferForTests,
} from "../lib/productEventBuffer.ts";
import { createAnalyticsRouter } from "./createAnalyticsRouter.ts";

describe("createAnalyticsRouter", () => {
  beforeEach(() => {
    resetProductEventBufferForTests();
    process.env.ADMIN_EMAILS = "admin@example.com";
  });

  function makeApp() {
    const app = express();
    app.use(express.json());
    app.use(createAnalyticsRouter());
    app.use(createErrorMiddleware());
    return app;
  }

  it("records client events via POST and lists them for site admins", async () => {
    await request(makeApp())
      .post("/product-events/record")
      .set("x-requested-with", "XMLHttpRequest")
      .send({
        productEvent: {
          event: "login",
          client: "web-auth",
          context: { method: "email" },
        },
      })
      .expect(204);

    recordProductEvent({ event: "server_boot" }, "server");

    const res = await request(makeApp())
      .get("/admin/product-events")
      .set(makeAdminHeaders("admin-1", "admin@example.com"))
      .expect(200);

    expect(res.body.productEvents).toHaveLength(2);
    expect(res.body.productEvents[0]).toMatchObject({
      name: "login",
      source: "client",
    });
    expect(res.body.productEvents[1]).toMatchObject({
      name: "server_boot",
      source: "server",
    });
    expect(listProductEvents()).toHaveLength(2);
  });

  it("filters listed events by name", async () => {
    recordProductEvent({ event: "login" }, "client");
    recordProductEvent({ event: "signup" }, "client");

    const res = await request(makeApp())
      .get("/admin/product-events")
      .query({ name: "signup" })
      .set(makeAdminHeaders("admin-1", "admin@example.com"))
      .expect(200);

    expect(res.body.productEvents).toHaveLength(1);
    expect(res.body.productEvents[0].name).toBe("signup");
  });

  it("returns 403 for non-admin list requests", async () => {
    await request(makeApp())
      .get("/admin/product-events")
      .set({
        "x-user-id": "user-1",
        "x-user-email": "user@example.com",
        "x-user-email-verified": "true",
        "x-user-is-admin": "false",
        "x-user-mfa-completed": "true",
        "x-requested-with": "XMLHttpRequest",
      })
      .expect(403);
  });
});
