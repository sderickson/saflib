import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { Readable } from "stream";
import { createBackupHttpApp } from "../../http.ts";
import { makeUserHeaders, makeAdminHeaders } from "@saflib/express";
import { backupDb } from "@saflib/backup-db";
import { TestObjectStore, StorageError } from "@saflib/object-store";

describe("GET /backups", () => {
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

  it("should return empty array when no backups exist", async () => {
    objectStore.setFiles([]);

    const response = await request(app)
      .get("/backups")
      .set(makeAdminHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("should return list of backups with valid .db files", async () => {
    const timestamp = Date.now();
    objectStore.setFiles([
      {
        path: `backup-${timestamp}-manual-test-backup-1.db`,
        size: 1024,
        metadata: { source: "database" },
      },
      {
        path: `backup-${timestamp + 1000}-automatic-test-backup-2.db`,
        size: 2048,
      },
      {
        path: "not-a-backup.txt",
        size: 100,
      },
      {
        path: "backup-invalid-format.db",
        size: 500,
      },
    ]);

    const response = await request(app)
      .get("/backups")
      .set(makeAdminHeaders());

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body).toHaveLength(2);

    expect(response.body[0]).toMatchObject({
      id: "test-backup-1",
      type: "manual",
      size: 1024,
      path: `backup-${timestamp}-manual-test-backup-1.db`,
      metadata: { source: "database" },
    });
    expect(response.body[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

    expect(response.body[1]).toMatchObject({
      id: "test-backup-2",
      type: "automatic",
      size: 2048,
      path: `backup-${timestamp + 1000}-automatic-test-backup-2.db`,
    });
    expect(response.body[1].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it("should filter out non-.db files", async () => {
    objectStore.setFiles([
      {
        path: "backup-1234567890-manual-test.db",
        size: 1024,
      },
      {
        path: "backup-1234567890-manual-test.sql",
        size: 1024,
      },
      {
        path: "backup-1234567890-manual-test.txt",
        size: 1024,
      },
    ]);

    const response = await request(app)
      .get("/backups")
      .set(makeAdminHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].path).toBe("backup-1234567890-manual-test.db");
  });

  it("should filter out files with invalid filename format", async () => {
    objectStore.setFiles([
      {
        path: "backup-1234567890-manual-test-backup.db",
        size: 1024,
      },
      {
        path: "backup-invalid.db",
        size: 1024,
      },
      {
        path: "backup-1234567890-invalid-type-test.db",
        size: 1024,
      },
    ]);

    const response = await request(app)
      .get("/backups")
      .set(makeAdminHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].path).toBe("backup-1234567890-manual-test-backup.db");
  });

  it("should return 403 for non-admin user", async () => {
    objectStore.setFiles([]);

    const response = await request(app)
      .get("/backups")
      .set(makeUserHeaders());

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("should require authentication", async () => {
    const response = await request(app).get("/backups");

    expect(response.status).toBe(401);
  });
});
