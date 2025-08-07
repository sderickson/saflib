// @ts-nocheck - TODO remove this line as part of workflow
import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
// import { createApp } from "../../app.ts";
import { makeUserHeaders } from "@saflib/express/vitest-helpers";

describe("routeTemplate", () => {
  let app: express.Express;

  beforeEach(() => {
    // app = createApp();
  });

  it("should handle successful requests", async () => {
    const response = await request(app)
      .post("/route-template")
      .set(makeUserHeaders())
      .send({
        // TODO: Add test request body
      });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({
      // TODO: Add expected response structure
      // Focus on identifiers and important data fields
      // Avoid asserting on fields that might change frequently
    });
  });

  it("should handle validation errors", async () => {
    const response = await request(app)
      .post("/route-template")
      .set(makeUserHeaders())
      .send({
        // TODO: Add invalid request body
      });

    expect(response.status).toBe(400);
    // Don't assert on response.body.message
  });
});
