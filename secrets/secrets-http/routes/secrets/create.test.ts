import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { createSecretsHttpApp } from "../../http.ts";
import { makeAdminHeaders, makeUserHeaders } from "@saflib/express";
import { secretQueries, secretQueries } from "@saflib/secrets-db";
import type { SecretsServiceRequestBody } from "@saflib/secrets-spec";

describe("POST /secrets", () => {
  let app: express.Express;
  let dbKey: symbol;

  beforeEach(() => {
    dbKey = secretQueries.connect();
    app = createSecretsHttpApp({ secretsDbKey: dbKey });
  });

  afterEach(() => {
    secretQueries.disconnect(dbKey);
  });

  it("should create a new secret successfully", async () => {
    const requestBody = {
      name: "test-secret",
      description: "A test secret",
      value: "super-secret-value",
    } satisfies SecretsServiceRequestBody["createSecret"];

    const response = await request(app)
      .post("/secrets")
      .set(makeAdminHeaders())
      .send(requestBody);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: "test-secret",
      description: "A test secret",
      masked_value: "***",
      is_active: true,
      id: expect.any(String),
      created_at: expect.any(Number),
      updated_at: expect.any(Number),
    });
  });

  it("should create a secret without description", async () => {
    const requestBody = {
      name: "test-secret-no-desc",
      value: "another-secret-value",
    } satisfies SecretsServiceRequestBody["createSecret"];

    const response = await request(app)
      .post("/secrets")
      .set(makeAdminHeaders())
      .send(requestBody);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      name: "test-secret-no-desc",
      masked_value: "***",
      is_active: true,
    });
    // Description should be undefined when not provided
    expect(response.body.description).toBeUndefined();
  });

  it("should return 409 when secret name already exists", async () => {
    // Create a secret first
    await secretQueries.create(dbKey, {
      name: "existing-secret",
      description: "Already exists",
      valueEncrypted: Buffer.from("encrypted-value"),
      createdBy: "test-user",
      isActive: true,
    });

    const requestBody = {
      name: "existing-secret",
      description: "Trying to create duplicate",
      value: "some-value",
    };

    const response = await request(app)
      .post("/secrets")
      .set(makeAdminHeaders())
      .send(requestBody);

    expect(response.status).toBe(409);
  });

  it("should require authentication", async () => {
    const requestBody = {
      name: "test-secret",
      value: "secret-value",
    };

    const response = await request(app).post("/secrets").send(requestBody);

    // Without headers, should get 401 from middleware
    expect(response.status).toBe(401);
  });

  it("should require admin privileges", async () => {
    const requestBody = {
      name: "test-secret",
      value: "secret-value",
    };

    const response = await request(app)
      .post("/secrets")
      .set(makeUserHeaders())
      .send(requestBody);

    expect(response.status).toBe(403);
  });

  it("should validate required fields", async () => {
    // Missing name
    const response1 = await request(app)
      .post("/secrets")
      .set(makeAdminHeaders())
      .send({
        value: "secret-value",
      });

    expect(response1.status).toBe(400);

    // Missing value
    const response2 = await request(app)
      .post("/secrets")
      .set(makeAdminHeaders())
      .send({
        name: "test-secret",
      });

    expect(response2.status).toBe(400);
  });
});
