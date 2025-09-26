import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { createSecretsHttpApp } from "../../http.ts";
import { makeAdminHeaders } from "@saflib/express";
import type { SecretsServiceRequestBody } from "@saflib/secrets-spec";
import { secretsDb, accessRequestQueries } from "@saflib/secrets-db";

describe("POST /access-requests/:id/approve", () => {
  let app: express.Express;
  let dbKey: symbol;
  let testAccessRequestId: string;

  beforeEach(async () => {
    dbKey = secretsDb.connect();
    app = createSecretsHttpApp({ secretsDbKey: dbKey });

    // Create a test access request for approving
    const { result } = await accessRequestQueries.create(dbKey, {
      secretName: "test-secret-name",
      serviceName: "test-service",
    });
    testAccessRequestId = result!.id;
  });

  afterEach(() => {
    secretsDb.disconnect(dbKey);
  });

  it("should approve access request successfully", async () => {
    const requestBody: SecretsServiceRequestBody["approveAccessRequest"] = {
      approved: true,
      reason: "Approved for testing",
    };

    const adminHeaders = makeAdminHeaders();
    const response = await request(app)
      .post(`/access-requests/${testAccessRequestId}/approve`)
      .set(adminHeaders)
      .send(requestBody);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: testAccessRequestId,
      secret_name: "test-secret-name",
      service_name: "test-service",
      status: "granted",
      granted_by: adminHeaders["x-user-email"],
    });
    expect(response.body.granted_at).toBeDefined();
  });

  it("should deny access request successfully", async () => {
    const requestBody: SecretsServiceRequestBody["approveAccessRequest"] = {
      approved: false,
      reason: "Denied for security reasons",
    };

    const adminHeaders = makeAdminHeaders();
    const response = await request(app)
      .post(`/access-requests/${testAccessRequestId}/approve`)
      .set(adminHeaders)
      .send(requestBody);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      id: testAccessRequestId,
      secret_name: "test-secret-name",
      service_name: "test-service",
      status: "denied",
      granted_by: adminHeaders["x-user-email"],
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
