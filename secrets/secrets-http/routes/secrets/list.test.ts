import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { createSecretsHttpApp } from "../../http.ts";
import { makeAdminHeaders } from "@saflib/express";
import { secretQueries, secretQueries } from "@saflib/secrets-db";

describe("GET /secrets", () => {
  let app: express.Express;
  let dbKey: symbol;

  beforeEach(() => {
    dbKey = secretQueries.connect();
    app = createSecretsHttpApp({ secretsDbKey: dbKey });
  });

  afterEach(() => {
    secretQueries.disconnect(dbKey);
  });

  it("should return empty array when no secrets exist", async () => {
    const response = await request(app).get("/secrets").set(makeAdminHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("should return list of secrets with masked values", async () => {
    // Create test secrets
    await secretQueries.create(dbKey, {
      name: "test-secret-1",
      description: "Test secret 1",
      valueEncrypted: Buffer.from("encrypted-value-1"),
      createdBy: "test-user",
      isActive: true,
    });

    await secretQueries.create(dbKey, {
      name: "test-secret-2",
      description: "Test secret 2",
      valueEncrypted: Buffer.from("encrypted-value-2"),
      createdBy: "test-user",
      isActive: false,
    });

    const response = await request(app).get("/secrets").set(makeAdminHeaders());

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(2);

    // Check first secret (most recently created should be first due to updated_at DESC)
    expect(response.body[0]).toMatchObject({
      name: "test-secret-2",
      description: "Test secret 2",
      masked_value: "***",
      is_active: false,
    });

    // Check second secret
    expect(response.body[1]).toMatchObject({
      name: "test-secret-1",
      description: "Test secret 1",
      masked_value: "***",
      is_active: true,
    });

    // Ensure timestamps are present
    expect(typeof response.body[0].created_at).toBe("number");
    expect(typeof response.body[0].updated_at).toBe("number");
  });

  it("should filter by is_active parameter", async () => {
    // Create test secrets
    await secretQueries.create(dbKey, {
      name: "active-secret",
      description: "Active secret",
      valueEncrypted: Buffer.from("encrypted-value"),
      createdBy: "test-user",
      isActive: true,
    });

    await secretQueries.create(dbKey, {
      name: "inactive-secret",
      description: "Inactive secret",
      valueEncrypted: Buffer.from("encrypted-value"),
      createdBy: "test-user",
      isActive: false,
    });

    // Get all secrets first to see what we have
    const allResponse = await request(app)
      .get("/secrets")
      .set(makeAdminHeaders());

    expect(allResponse.status).toBe(200);
    expect(allResponse.body).toHaveLength(2);

    // Test filtering for active secrets
    const activeResponse = await request(app)
      .get("/secrets?is_active=true")
      .set(makeAdminHeaders());

    expect(activeResponse.status).toBe(200);
    expect(activeResponse.body).toHaveLength(1);
    expect(
      activeResponse.body.find((s: any) => s.name === "active-secret"),
    ).toBeTruthy();

    // Test filtering for inactive secrets
    const inactiveResponse = await request(app)
      .get("/secrets?is_active=false")
      .set(makeAdminHeaders());

    expect(inactiveResponse.status).toBe(200);
    expect(inactiveResponse.body).toHaveLength(1);
    expect(
      inactiveResponse.body.find((s: any) => s.name === "inactive-secret"),
    ).toBeTruthy();
  });

  it("should support pagination with limit and offset", async () => {
    // Create multiple test secrets
    for (let i = 0; i < 5; i++) {
      await secretQueries.create(dbKey, {
        name: `secret-${i}`,
        description: `Test secret ${i}`,
        valueEncrypted: Buffer.from(`encrypted-value-${i}`),
        createdBy: "test-user",
        isActive: true,
      });
    }

    // Test pagination
    const response = await request(app)
      .get("/secrets?limit=2&offset=1")
      .set(makeAdminHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
  });

  it("should sort by updated_at descending (most recent first)", async () => {
    // Create first secret
    await secretQueries.create(dbKey, {
      name: "first-secret",
      description: "First secret",
      valueEncrypted: Buffer.from("encrypted-value"),
      createdBy: "test-user",
      isActive: true,
    });

    // Wait a moment to ensure different timestamps
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Create second secret (should appear first due to more recent updated_at)
    await secretQueries.create(dbKey, {
      name: "second-secret",
      description: "Second secret",
      valueEncrypted: Buffer.from("encrypted-value"),
      createdBy: "test-user",
      isActive: true,
    });

    const response = await request(app).get("/secrets").set(makeAdminHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    // Most recently created/updated should be first
    expect(response.body[0].name).toBe("second-secret");
    expect(response.body[1].name).toBe("first-secret");
  });

  it("should require authentication", async () => {
    const response = await request(app).get("/secrets");
    // Without headers, should get 401 from middleware
    expect(response.status).toBe(401);
  });
});
