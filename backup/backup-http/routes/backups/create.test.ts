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
} from "@saflib/object-store";

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

  it("should return 500 when backup already exists (returns StorageError)", async () => {
    const errorObjectStore = new TestObjectStore();
    const testPath = "backup-1234567890-manual-test-id.db";
    errorObjectStore.setFiles([{ path: testPath }]);
    errorObjectStore.setUploadShouldFail(new StorageError(
      `Blob ${testPath} already exists in container test-container. Use force=true to overwrite.`
    ));
    const errorApp = createBackupHttpApp({
      backupDbKey: dbKey,
      backupFn: async () => new Readable(),
      objectStore: errorObjectStore,
    });

    const response = await request(errorApp)
      .post("/backups")
      .set(makeAdminHeaders())
      .send({});

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      code: "STORAGE_ERROR",
    });
  });

  it("should return 500 for invalid upload parameters (returns StorageError)", async () => {
    const errorObjectStore = new TestObjectStore();
    errorObjectStore.setUploadShouldFail(new StorageError(
      "Either buffer or stream must be provided, but not both",
      new InvalidUploadParamsError()
    ));
    const errorApp = createBackupHttpApp({
      backupDbKey: dbKey,
      backupFn: async () => new Readable(),
      objectStore: errorObjectStore,
    });

    const response = await request(errorApp)
      .post("/backups")
      .set(makeAdminHeaders())
      .send({});

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      code: "STORAGE_ERROR",
    });
  });

  it("should return 500 for storage error", async () => {
    const errorObjectStore = new TestObjectStore();
    errorObjectStore.setUploadShouldFail(new StorageError("Storage operation failed"));
    const errorApp = createBackupHttpApp({
      backupDbKey: dbKey,
      backupFn: async () => new Readable(),
      objectStore: errorObjectStore,
    });

    const response = await request(errorApp)
      .post("/backups")
      .set(makeAdminHeaders())
      .send({});

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      code: "STORAGE_ERROR",
    });
  });

  it("should return 500 when upload fails", async () => {
    const errorObjectStore = new TestObjectStore();
    errorObjectStore.setUploadShouldFail(new StorageError("Upload failed"));
    const errorApp = createBackupHttpApp({
      backupDbKey: dbKey,
      backupFn: async () => new Readable(),
      objectStore: errorObjectStore,
    });

    const response = await request(errorApp)
      .post("/backups")
      .set(makeAdminHeaders())
      .send({});

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      code: "UPLOAD_FAILED",
    });
  });

  it("should return 500 when listFiles fails", async () => {
    const errorObjectStore = new TestObjectStore();
    errorObjectStore.setListShouldFail(new StorageError("Failed to list files"));
    const errorApp = createBackupHttpApp({
      backupDbKey: dbKey,
      backupFn: async () => new Readable(),
      objectStore: errorObjectStore,
    });

    const response = await request(errorApp)
      .post("/backups")
      .set(makeAdminHeaders())
      .send({});

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      code: "LIST_FILES_ERROR",
    });
  });

  it("should return 500 when backup not found after upload", async () => {
    const errorObjectStore = new TestObjectStore();
    errorObjectStore.setListShouldFail(new StorageError("Backup not found"));
    const errorApp = createBackupHttpApp({
      backupDbKey: dbKey,
      backupFn: async () => new Readable(),
      objectStore: errorObjectStore,
    });

    const response = await request(errorApp)
      .post("/backups")
      .set(makeAdminHeaders())
      .send({});

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      code: "BACKUP_NOT_FOUND",
    });
  });
});
