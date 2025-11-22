import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { Readable } from "stream";
import { createBackupHttpApp } from "../../http.ts";
import { makeUserHeaders, makeAdminHeaders } from "@saflib/express";
import { backupDb } from "@saflib/backup-db";
import {
  TestObjectStore,
  InvalidUploadParamsError,
  StorageError,
  ObjectStore,
} from "@saflib/object-store";
import type { ReturnsError } from "@saflib/monorepo";

describe("POST /backups", () => {
  let app: express.Express;
  let dbKey: symbol;
  let objectStore: TestObjectStore;

  beforeEach(() => {
    dbKey = backupDb.connect();
    objectStore = new TestObjectStore();
    app = createBackupHttpApp({
      backupDbKey: dbKey,
      backupFn: async () => new Readable(),
      objectStore,
    });
  });

  afterEach(() => {
    backupDb.disconnect(dbKey);
  });

  it("should create backup successfully", async () => {
    const response = await request(app)
      .post("/backups")
      .set(makeAdminHeaders())
      .send({});

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: expect.any(String),
      type: "manual",
      timestamp: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/),
      size: 1024,
      path: expect.stringMatching(/^backup-\d+-manual-.+\.db$/),
    });
  });

  it("should create backup with description and tags", async () => {
    const response = await request(app)
      .post("/backups")
      .set(makeAdminHeaders())
      .send({
        description: "Test backup",
        tags: ["test", "manual"],
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      id: expect.any(String),
      type: "manual",
      metadata: {
        description: "Test backup",
        tags: '["test","manual"]',
      },
    });
  });

  it("should return 403 for non-admin user", async () => {
    const response = await request(app)
      .post("/backups")
      .set(makeUserHeaders())
      .send({});

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("should return 401 when authentication is missing", async () => {
    const response = await request(app).post("/backups").send({});

    expect(response.status).toBe(401);
  });
});
