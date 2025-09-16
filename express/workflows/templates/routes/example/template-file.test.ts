import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { createTemplateFileHttpApp } from "../../http.ts";
import { makeUserHeaders } from "@saflib/express";

describe("templateFile", () => {
  let app: express.Express;

  beforeEach(() => {
    app = createTemplateFileHttpApp({});
  });

  // TODO: unskip this test
  it.skip("should handle successful requests", async () => {
    const response = await request(app)
      .post("/resource-name/template-file")
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

  // TODO: unskip this test
  it.skip("should handle validation errors", async () => {
    const response = await request(app)
      .post("/resource-name/template-file")
      .set(makeUserHeaders())
      .send({
        // TODO: Add invalid request body
      });

    expect(response.status).toBe(400);
    // Don't assert on response.body.message
  });
});
