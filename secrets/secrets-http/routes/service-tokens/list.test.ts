import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { createSecretsHttpApp } from "../../http.ts";
import { makeAdminHeaders } from "@saflib/express";
import { secretsDb, serviceToken } from "@saflib/secrets-db";

describe("GET /service-tokens", () => {
  let app: express.Express;
  let dbKey: symbol;

  beforeEach(async () => {
    dbKey = secretsDb.connect();
    app = createSecretsHttpApp({ secretsDbKey: dbKey });
  });

  afterEach(() => {
    secretsDb.disconnect(dbKey);
  });

  it("should return empty array when no service tokens exist", async () => {
    const response = await request(app)
      .get("/service-tokens")
      .set(makeAdminHeaders());

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(0);
  });

  it("should return list of service tokens with truncated token hashes", async () => {
    // Create test service tokens
    await serviceToken.create(dbKey, {
      serviceName: "test-service-1",
      tokenHash: "test-hash-1-very-long-hash-value",
      serviceVersion: "1.0.0",
    });

    await serviceToken.create(dbKey, {
      serviceName: "test-service-2",
      tokenHash: "test-hash-2-very-long-hash-value",
      serviceVersion: "2.0.0",
    });

    const response = await request(app)
      .get("/service-tokens")
      .set(makeAdminHeaders());

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(2);

    // Check first service token (most recent should be first due to requested_at DESC)
    expect(response.body[0]).toMatchObject({
      service_name: "test-service-2",
      token_hash: "test-has...", // Should be truncated to 8 chars + "..."
      service_version: "2.0.0",
      approved: false,
      access_count: 0,
    });
    expect(response.body[0].requested_at).toBeDefined();

    // Check second service token
    expect(response.body[1]).toMatchObject({
      service_name: "test-service-1",
      token_hash: "test-has...", // Should be truncated to 8 chars + "..."
      service_version: "1.0.0",
      approved: false,
      access_count: 0,
    });
    expect(response.body[1].requested_at).toBeDefined();
  });

  it("should filter by approved status", async () => {
    // Create approved and unapproved service tokens
    await serviceToken.create(dbKey, {
      serviceName: "approved-service",
      tokenHash: "approved-hash",
      serviceVersion: "1.0.0",
    });

    await serviceToken.create(dbKey, {
      serviceName: "unapproved-service",
      tokenHash: "unapproved-hash",
      serviceVersion: "1.0.0",
    });

    // Approve the first token
    const { result: tokens } = await serviceToken.list(dbKey);
    const approvedToken = tokens?.find(
      (t) => t.serviceName === "approved-service",
    );
    if (approvedToken) {
      await serviceToken.updateApproval(dbKey, {
        id: approvedToken.id,
        approved: true,
        approvedBy: "admin@example.com",
      });
    }

    // Test filtering by approved=true
    const approvedResponse = await request(app)
      .get("/service-tokens?approved=true")
      .set(makeAdminHeaders());

    expect(approvedResponse.status).toBe(200);
    expect(approvedResponse.body).toHaveLength(1);
    expect(approvedResponse.body[0].service_name).toBe("approved-service");

    // Test filtering by approved=false
    const unapprovedResponse = await request(app)
      .get("/service-tokens?approved=false")
      .set(makeAdminHeaders());

    expect(unapprovedResponse.status).toBe(200);
    expect(unapprovedResponse.body).toHaveLength(1);
    expect(unapprovedResponse.body[0].service_name).toBe("unapproved-service");
  });

  it("should filter by service name", async () => {
    await serviceToken.create(dbKey, {
      serviceName: "alpha-service",
      tokenHash: "alpha-hash",
      serviceVersion: "1.0.0",
    });

    await serviceToken.create(dbKey, {
      serviceName: "beta-service",
      tokenHash: "beta-hash",
      serviceVersion: "1.0.0",
    });

    const response = await request(app)
      .get("/service-tokens?service_name=alpha-service")
      .set(makeAdminHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].service_name).toBe("alpha-service");
  });

  it("should support pagination with limit and offset", async () => {
    // Create multiple service tokens
    for (let i = 1; i <= 5; i++) {
      await serviceToken.create(dbKey, {
        serviceName: `service-${i}`,
        tokenHash: `hash-${i}`,
        serviceVersion: "1.0.0",
      });
    }

    // Test limit
    const limitResponse = await request(app)
      .get("/service-tokens?limit=2")
      .set(makeAdminHeaders());

    expect(limitResponse.status).toBe(200);
    expect(limitResponse.body).toHaveLength(2);

    // Test offset
    const offsetResponse = await request(app)
      .get("/service-tokens?offset=2&limit=2")
      .set(makeAdminHeaders());

    expect(offsetResponse.status).toBe(200);
    expect(offsetResponse.body).toHaveLength(2);
    // Should be different from the first 2
    expect(offsetResponse.body[0].service_name).not.toBe(
      limitResponse.body[0].service_name,
    );
  });

  it("should require authentication", async () => {
    const response = await request(app).get("/service-tokens");
    // Without headers, should get 401 from middleware
    expect(response.status).toBe(401);
  });
});
