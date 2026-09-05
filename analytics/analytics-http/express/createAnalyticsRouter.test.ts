import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import { createErrorMiddleware } from "@saflib/express";
import {
  listProductEvents,
  recordProductEvent,
  resetProductEventBufferForTests,
} from "../lib/productEventBuffer.ts";
import { createDevAnalyticsRouter } from "./createAnalyticsRouter.ts";

describe("createDevAnalyticsRouter", () => {
  beforeEach(() => {
    resetProductEventBufferForTests();
  });

  function makeApp() {
    const app = express();
    app.use(express.json());
    app.use(createDevAnalyticsRouter());
    app.use(createErrorMiddleware());
    return app;
  }

  it("records client events via POST and lists them without auth", async () => {
    await request(makeApp())
      .post("/product-events/record")
      .set("x-requested-with", "XMLHttpRequest")
      .send({
        product_event: {
          event: "login",
          client: "web-auth",
          context: { method: "email" },
        },
      })
      .expect(204);

    recordProductEvent({ event: "server_boot" }, "server");

    const res = await request(makeApp())
      .get("/admin/product-events")
      .set("x-requested-with", "XMLHttpRequest")
      .expect(200);

    expect(res.body.product_events).toHaveLength(2);
    expect(res.body.product_events[0]).toMatchObject({
      name: "login",
      source: "client",
    });
    expect(res.body.product_events[1]).toMatchObject({
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
      .set("x-requested-with", "XMLHttpRequest")
      .expect(200);

    expect(res.body.product_events).toHaveLength(1);
    expect(res.body.product_events[0].name).toBe("signup");
  });
});
