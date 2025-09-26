import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { createSecretsHttpApp } from "../../http.ts";
import { makeAdminHeaders } from "@saflib/express";
import type { SecretsServiceRequestBody } from "@saflib/secrets-spec";
import { secretsDb, serviceTokenQueries } from "@saflib/secrets-db";

describe("POST /service-tokens/:id/approve", () => {
  let app: express.Express;
  let dbKey: symbol;
  let testServiceTokenId: string;

  beforeEach(async () => {
    dbKey = secretsDb.connect();
    app = createSecretsHttpApp({ secretsDbKey: dbKey });

    // Create a test service token for approving
    const { result } = await serviceTokenQueries.create(dbKey, {
      serviceName: "test-service",
      tokenHash: "test-token-hash",
      serviceVersion: "1.0.0",
    });
    testServiceTokenId = result!.id;
  });

  afterEach(() => {
    secretsDb.disconnect(dbKey);
  });

  it("should approve service token successfully", async () => {
    const requestBody: SecretsServiceRequestBody["approveServiceToken"] = {
      approved: true,
      reason: "Approved for testing",
    };

    const response = await request(app)
      .post(`/service-tokens/${testServiceTokenId}/approve`)
      .set(makeAdminHeaders())
      .send(requestBody);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: testServiceTokenId,
      service_name: "test-service",
      service_version: "1.0.0",
      approved: true,
      approved_by: "admin1@example.com", // Identity-provided email
    });
    expect(response.body.approved_at).toBeDefined();
  });

  it("should deny service token successfully", async () => {
    const requestBody: SecretsServiceRequestBody["approveServiceToken"] = {
      approved: false,
      reason: "Denied for security reasons",
    };

    const response = await request(app)
      .post(`/service-tokens/${testServiceTokenId}/approve`)
      .set(makeAdminHeaders())
      .send(requestBody);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: testServiceTokenId,
      service_name: "test-service",
      service_version: "1.0.0",
      approved: false,
      approved_by: "admin2@example.com", // Identity-provided email
    });
    expect(response.body.approved_at).toBeDefined();
  });

  it("should return 404 for non-existent service token", async () => {
    const nonExistentId = "non-existent-id";
    const requestBody: SecretsServiceRequestBody["approveServiceToken"] = {
      approved: true,
      reason: "Approved for testing",
    };

    const response = await request(app)
      .post(`/service-tokens/${nonExistentId}/approve`)
      .set(makeAdminHeaders())
      .send(requestBody);

    expect(response.status).toBe(404);
  });

  it("should require authentication", async () => {
    const requestBody: SecretsServiceRequestBody["approveServiceToken"] = {
      approved: true,
      reason: "Approved for testing",
    };

    const response = await request(app)
      .post(`/service-tokens/${testServiceTokenId}/approve`)
      .send(requestBody);

    expect(response.status).toBe(401);
  });
});
