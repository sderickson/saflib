import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { createSecretsHttpApp } from "../../http.ts";
import { makeAdminHeaders } from "@saflib/express";
import type { SecretsServiceRequestBody } from "@saflib/secrets-spec";
import { secretQueries, accessRequestQueries } from "@saflib/secrets-db";

describe("POST /access-requests/:id/approve", () => {
  let app: express.Express;
  let dbKey: symbol;
  let testAccessRequestId: string;

  beforeEach(async () => {
    dbKey = secretQueries.connect();
    app = createSecretsHttpApp({ secretsDbKey: dbKey });

    // Create a test access request for approving
    const { result } = await accessRequestQueries.create(dbKey, {
      secretId: "test-secret-id",
      serviceName: "test-service",
      status: "pending",
    });
    testAccessRequestId = result!.id;
  });

  afterEach(() => {
    secretQueries.disconnect(dbKey);
  });

  it("should approve access request successfully", async () => {
    const requestBody: SecretsServiceRequestBody["approveAccessRequest"] = {
      approved: true,
      reason: "Approved for testing",
    };

    const response = await request(app)
      .post(`/access-requests/${testAccessRequestId}/approve`)
      .set(makeAdminHeaders())
      .send(requestBody);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: testAccessRequestId,
      secret_id: "test-secret-id",
      service_name: "test-service",
      status: "granted",
      granted_by: "admin1@example.com", // Identity-provided email
    });
    expect(response.body.granted_at).toBeDefined();
  });

  it("should deny access request successfully", async () => {
    const requestBody: SecretsServiceRequestBody["approveAccessRequest"] = {
      approved: false,
      reason: "Denied for security reasons",
    };

    const response = await request(app)
      .post(`/access-requests/${testAccessRequestId}/approve`)
      .set(makeAdminHeaders())
      .send(requestBody);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: testAccessRequestId,
      secret_id: "test-secret-id",
      service_name: "test-service",
      status: "denied",
      granted_by: "admin2@example.com", // Identity-provided email
    });
    expect(response.body.granted_at).toBeDefined();
  });

  it("should return 404 for non-existent access request", async () => {
    const nonExistentId = "non-existent-id";
    const requestBody: SecretsServiceRequestBody["approveAccessRequest"] = {
      approved: true,
      reason: "Approved for testing",
    };

    const response = await request(app)
      .post(`/access-requests/${nonExistentId}/approve`)
      .set(makeAdminHeaders())
      .send(requestBody);

    expect(response.status).toBe(404);
  });

  it("should require authentication", async () => {
    const requestBody: SecretsServiceRequestBody["approveAccessRequest"] = {
      approved: true,
      reason: "Approved for testing",
    };

    const response = await request(app)
      .post(`/access-requests/${testAccessRequestId}/approve`)
      .send(requestBody);

    expect(response.status).toBe(401);
  });
});
