import { describe, it, expect, beforeEach, afterEach, assert } from "vitest";
import request from "supertest";
import express from "express";
import { createSecretsHttpApp } from "../../http.ts";
import { makeAdminHeaders } from "@saflib/express";
import {
  secretsDb,
  accessRequestQueries,
  secretQueries,
} from "@saflib/secrets-db";

describe("GET /access-requests", () => {
  let app: express.Express;
  let dbKey: symbol;

  beforeEach(() => {
    dbKey = secretsDb.connect();
    app = createSecretsHttpApp({ secretsDbKey: dbKey });
  });

  afterEach(() => {
    secretsDb.disconnect(dbKey);
  });

  it("should return empty array when no access requests exist", async () => {
    const response = await request(app)
      .get("/access-requests")
      .set(makeAdminHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("should return list of access requests", async () => {
    // Create a test secret first
    const { result: secret } = await secretQueries.create(dbKey, {
      name: "test-secret",
      description: "Test secret",
      valueEncrypted: Buffer.from("encrypted-value"),
      createdBy: "test-user",
      isActive: true,
    });

    assert(secret, "Failed to create secret");

    // Create test access requests
    await accessRequestQueries.create(dbKey, {
      secretName: secret.name,
      serviceName: "test-service-1",
    });

    const { result: request2 } = await accessRequestQueries.create(dbKey, {
      secretName: secret.name,
      serviceName: "test-service-2",
    });

    assert(request2, "Failed to create access request");

    // Update the second request to granted status
    await accessRequestQueries.updateStatus(dbKey, {
      id: request2.id,
      status: "granted",
      grantedBy: "admin-user",
    });

    const response = await request(app)
      .get("/access-requests")
      .set(makeAdminHeaders());

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(2);

    // Check that access requests are returned with proper format
    const accessRequests = response.body;
    expect(accessRequests[0]).toHaveProperty("id");
    expect(accessRequests[0]).toHaveProperty("secret_name");
    expect(accessRequests[0]).toHaveProperty("service_name");
    expect(accessRequests[0]).toHaveProperty("requested_at");
    expect(accessRequests[0]).toHaveProperty("status");
    expect(accessRequests[0]).toHaveProperty("access_count");

    // Check that timestamps are numbers
    expect(typeof accessRequests[0].requested_at).toBe("number");
  });

  it("should filter by status parameter", async () => {
    // Create a test secret first
    const { result: secret } = await secretQueries.create(dbKey, {
      name: "test-secret",
      description: "Test secret",
      valueEncrypted: Buffer.from("encrypted-value"),
      createdBy: "test-user",
      isActive: true,
    });

    assert(secret, "Failed to create secret");

    // Create access requests with different statuses
    await accessRequestQueries.create(dbKey, {
      secretName: secret.name,
      serviceName: "pending-service",
    });

    const { result: grantedRequest } = await accessRequestQueries.create(
      dbKey,
      {
        secretName: secret.name,
        serviceName: "granted-service",
      },
    );

    const { result: deniedRequest } = await accessRequestQueries.create(dbKey, {
      secretName: secret.name,
      serviceName: "denied-service",
    });

    assert(grantedRequest, "Failed to create granted request");
    assert(deniedRequest, "Failed to create denied request");

    // Update statuses
    await accessRequestQueries.updateStatus(dbKey, {
      id: grantedRequest.id,
      status: "granted",
      grantedBy: "admin-user",
    });

    await accessRequestQueries.updateStatus(dbKey, {
      id: deniedRequest.id,
      status: "denied",
      grantedBy: "admin-user",
    });

    // Test filtering for pending requests
    const pendingResponse = await request(app)
      .get("/access-requests?status=pending")
      .set(makeAdminHeaders());

    expect(pendingResponse.status).toBe(200);
    expect(pendingResponse.body).toHaveLength(1);
    expect(pendingResponse.body[0].service_name).toBe("pending-service");
    expect(pendingResponse.body[0].status).toBe("pending");

    // Test filtering for granted requests
    const grantedResponse = await request(app)
      .get("/access-requests?status=granted")
      .set(makeAdminHeaders());

    expect(grantedResponse.status).toBe(200);
    expect(grantedResponse.body).toHaveLength(1);
    expect(grantedResponse.body[0].service_name).toBe("granted-service");
    expect(grantedResponse.body[0].status).toBe("granted");

    // Test filtering for denied requests
    const deniedResponse = await request(app)
      .get("/access-requests?status=denied")
      .set(makeAdminHeaders());

    expect(deniedResponse.status).toBe(200);
    expect(deniedResponse.body).toHaveLength(1);
    expect(deniedResponse.body[0].service_name).toBe("denied-service");
    expect(deniedResponse.body[0].status).toBe("denied");
  });

  it("should filter by service_name parameter", async () => {
    // Create a test secret first
    const { result: secret } = await secretQueries.create(dbKey, {
      name: "test-secret",
      description: "Test secret",
      valueEncrypted: Buffer.from("encrypted-value"),
      createdBy: "test-user",
      isActive: true,
    });

    assert(secret, "Failed to create secret");

    // Create access requests for different services
    await accessRequestQueries.create(dbKey, {
      secretName: secret.name,
      serviceName: "service-a",
    });

    const { result: serviceBRequest } = await accessRequestQueries.create(
      dbKey,
      {
        secretName: secret.name,
        serviceName: "service-b",
      },
    );

    assert(serviceBRequest, "Failed to create service B request");

    // Update service B to granted
    await accessRequestQueries.updateStatus(dbKey, {
      id: serviceBRequest.id,
      status: "granted",
      grantedBy: "admin-user",
    });

    // Test filtering by service name
    const serviceAResponse = await request(app)
      .get("/access-requests?service_name=service-a")
      .set(makeAdminHeaders());

    expect(serviceAResponse.status).toBe(200);
    expect(serviceAResponse.body).toHaveLength(1);
    expect(serviceAResponse.body[0].service_name).toBe("service-a");

    const serviceBResponse = await request(app)
      .get("/access-requests?service_name=service-b")
      .set(makeAdminHeaders());

    expect(serviceBResponse.status).toBe(200);
    expect(serviceBResponse.body).toHaveLength(1);
    expect(serviceBResponse.body[0].service_name).toBe("service-b");
  });

  it("should support pagination with limit and offset", async () => {
    // Create a test secret first
    const { result: secret } = await secretQueries.create(dbKey, {
      name: "test-secret",
      description: "Test secret",
      valueEncrypted: Buffer.from("encrypted-value"),
      createdBy: "test-user",
      isActive: true,
    });

    assert(secret, "Failed to create secret");

    // Create multiple test access requests
    for (let i = 0; i < 5; i++) {
      await accessRequestQueries.create(dbKey, {
        secretName: secret.name,
        serviceName: `service-${i}`,
      });
    }

    // Test pagination
    const response = await request(app)
      .get("/access-requests?limit=2&offset=1")
      .set(makeAdminHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  it("should sort by requested_at descending (most recent first)", async () => {
    // Create a test secret first
    const { result: secret } = await secretQueries.create(dbKey, {
      name: "test-secret",
      description: "Test secret",
      valueEncrypted: Buffer.from("encrypted-value"),
      createdBy: "test-user",
      isActive: true,
    });

    assert(secret, "Failed to create secret");

    // Create first access request
    await accessRequestQueries.create(dbKey, {
      secretName: secret.name,
      serviceName: "first-service",
    });

    // Wait a moment to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Create second access request (should appear first due to more recent requested_at)
    await accessRequestQueries.create(dbKey, {
      secretName: secret.name,
      serviceName: "second-service",
    });

    const response = await request(app)
      .get("/access-requests")
      .set(makeAdminHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    // Most recently created should be first
    expect(response.body[0].service_name).toBe("second-service");
    expect(response.body[1].service_name).toBe("first-service");
  });

  it("should require authentication", async () => {
    const response = await request(app).get("/access-requests");
    // Without headers, should get 401 from middleware
    expect(response.status).toBe(401);
  });
});
