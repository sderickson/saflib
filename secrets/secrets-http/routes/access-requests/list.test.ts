import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { createSecretsHttpApp } from "../../http.ts";
import { makeAdminHeaders } from "@saflib/express";
import { secretsDb } from "@saflib/secrets-db";

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

  it("should return empty array (placeholder implementation)", async () => {
    const response = await request(app)
      .get("/access-requests")
      .set(makeAdminHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });
});
