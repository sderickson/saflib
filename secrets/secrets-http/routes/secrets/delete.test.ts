import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { createSecretsHttpApp } from "../../http.ts";
import { makeAdminHeaders } from "@saflib/express";
import { secretQueries, secretQueries } from "@saflib/secrets-db";

describe("DELETE /secrets/:id", () => {
  let app: express.Express;
  let dbKey: symbol;
  let testSecretId: string;

  beforeEach(async () => {
    dbKey = secretQueries.connect();
    app = createSecretsHttpApp({ secretsDbKey: dbKey });

    // Create a test secret for deleting
    const { result } = await secretQueries.create(dbKey, {
      name: "test-secret-to-delete",
      description: "Secret to be deleted",
      valueEncrypted: Buffer.from("encrypted-value"),
      createdBy: "test-user",
      isActive: true,
    });
    testSecretId = result!.id;
  });

  afterEach(() => {
    secretQueries.disconnect(dbKey);
  });

  it("should soft delete secret successfully", async () => {
    const response = await request(app)
      .delete(`/secrets/${testSecretId}`)
      .set(makeAdminHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      message: "Secret deleted successfully",
    });

    // Verify the secret is soft deleted (is_active = false)
    const { result: updatedSecret } = await secretQueries.getById(
      dbKey,
      testSecretId,
    );
    expect(updatedSecret!.isActive).toBe(false);
    expect(updatedSecret!.name).toBe("test-secret-to-delete"); // Still exists in DB
  });

  it("should return 404 for non-existent secret", async () => {
    const nonExistentId = "non-existent-id";

    const response = await request(app)
      .delete(`/secrets/${nonExistentId}`)
      .set(makeAdminHeaders());

    expect(response.status).toBe(404);
  });

  it("should be idempotent - deleting already deleted secret should succeed", async () => {
    // First delete
    const response1 = await request(app)
      .delete(`/secrets/${testSecretId}`)
      .set(makeAdminHeaders());

    expect(response1.status).toBe(200);

    // Second delete (idempotent)
    const response2 = await request(app)
      .delete(`/secrets/${testSecretId}`)
      .set(makeAdminHeaders());

    expect(response2.status).toBe(200);
    expect(response2.body).toMatchObject({
      message: "Secret deleted successfully",
    });
  });

  it("should require authentication", async () => {
    const response = await request(app).delete(`/secrets/${testSecretId}`);

    // Without headers, should get 401 from middleware
    expect(response.status).toBe(401);
  });

  it("should handle UUID format validation", async () => {
    const invalidId = "invalid-uuid-format";

    const response = await request(app)
      .delete(`/secrets/${invalidId}`)
      .set(makeAdminHeaders());

    // This might return 404 (not found) or 400 (bad request) depending on validation
    expect([400, 404]).toContain(response.status);
  });
});
