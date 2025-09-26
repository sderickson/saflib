import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { createSecretsHttpApp } from "../../http.ts";
import { makeAdminHeaders, makeUserHeaders } from "@saflib/express";
import { secretQueries, secretQueries } from "@saflib/secrets-db";

describe("PUT /secrets/:id", () => {
  let app: express.Express;
  let dbKey: symbol;
  let testSecretId: string;

  beforeEach(async () => {
    dbKey = secretQueries.connect();
    app = createSecretsHttpApp({ secretsDbKey: dbKey });

    // Create a test secret for updating
    const { result } = await secretQueries.create(dbKey, {
      name: "test-secret",
      description: "Original description",
      valueEncrypted: Buffer.from("encrypted-value"),
      createdBy: "test-user",
      isActive: true,
    });
    testSecretId = result!.id;
  });

  afterEach(() => {
    secretQueries.disconnect(dbKey);
  });

  it("should update secret description successfully", async () => {
    const requestBody = {
      description: "Updated description",
    };

    const response = await request(app)
      .put(`/secrets/${testSecretId}`)
      .set(makeAdminHeaders())
      .send(requestBody);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: testSecretId,
      name: "test-secret",
      description: "Updated description",
      masked_value: "***",
      is_active: true,
    });
  });

  it("should update secret value successfully", async () => {
    const requestBody = {
      value: "new-secret-value",
    };

    const response = await request(app)
      .put(`/secrets/${testSecretId}`)
      .set(makeAdminHeaders())
      .send(requestBody);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: testSecretId,
      name: "test-secret",
      description: "Original description",
      masked_value: "***",
      is_active: true,
    });

    // The updated_at timestamp should be more recent
    expect(typeof response.body.updated_at).toBe("number");
  });

  it("should update secret active status successfully", async () => {
    const requestBody = {
      is_active: false,
    };

    const response = await request(app)
      .put(`/secrets/${testSecretId}`)
      .set(makeAdminHeaders())
      .send(requestBody);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: testSecretId,
      name: "test-secret",
      description: "Original description",
      masked_value: "***",
      is_active: false,
    });
  });

  it("should update multiple fields at once", async () => {
    const requestBody = {
      description: "Completely updated",
      value: "brand-new-secret",
      is_active: false,
    };

    const response = await request(app)
      .put(`/secrets/${testSecretId}`)
      .set(makeAdminHeaders())
      .send(requestBody);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: testSecretId,
      name: "test-secret",
      description: "Completely updated",
      masked_value: "***",
      is_active: false,
    });
  });

  it("should return 404 for non-existent secret", async () => {
    const nonExistentId = "non-existent-id";
    const requestBody = {
      description: "Updated description",
    };

    const response = await request(app)
      .put(`/secrets/${nonExistentId}`)
      .set(makeAdminHeaders())
      .send(requestBody);

    expect(response.status).toBe(404);
  });

  it("should handle empty update request", async () => {
    const requestBody = {};

    const response = await request(app)
      .put(`/secrets/${testSecretId}`)
      .set(makeAdminHeaders())
      .send(requestBody);

    expect(response.status).toBe(200);
    // Should return the same secret unchanged
    expect(response.body).toMatchObject({
      id: testSecretId,
      name: "test-secret",
      description: "Original description",
      masked_value: "***",
      is_active: true,
    });
  });

  it("should require authentication", async () => {
    const requestBody = {
      description: "Updated description",
    };

    const response = await request(app)
      .put(`/secrets/${testSecretId}`)
      .send(requestBody);

    // Without headers, should get 401 from middleware
    expect(response.status).toBe(401);
  });

  it("should return 403 for non-admin user", async () => {
    const requestBody = {
      description: "Updated description",
    };

    const response = await request(app)
      .put(`/secrets/${testSecretId}`)
      .set(makeUserHeaders())
      .send(requestBody);

    expect(response.status).toBe(403);
  });
});
