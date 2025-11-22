import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { Readable } from "stream";
import { createBackupHttpApp } from "../../http.ts";
import { makeUserHeaders, makeAdminHeaders } from "@saflib/express";
import { backupDb } from "@saflib/backup-db";
import { ObjectStore } from "@saflib/object-store";
import {
  BlobAlreadyExistsError,
  InvalidUploadParamsError,
  StorageError,
} from "@saflib/object-store";
import type { ReturnsError } from "@saflib/monorepo";

class FakeObjectStore extends ObjectStore {
  private files: Array<{
    path: string;
    size?: number;
    metadata?: Record<string, string>;
  }> = [];

  constructor() {
    super("test-container");
  }

  async uploadFile(
    path: string,
    _stream: Readable,
    metadata?: Record<string, string>,
  ): Promise<ReturnsError<{ success: boolean; url?: string }>> {
    const existingFile = this.files.find((f) => f.path === path);
    if (existingFile) {
      return {
        error: new BlobAlreadyExistsError(path, "test-container"),
      };
    }

    this.files.push({
      path,
      size: 1024,
      metadata,
    });

    return {
      result: {
        success: true,
        url: `https://mock-storage.blob.core.windows.net/test-container/${path}`,
      },
    };
  }

  async listFiles(): Promise<
    ReturnsError<
      Array<{ path: string; size?: number; metadata?: Record<string, string> }>
    >
  > {
    return { result: this.files };
  }

  async deleteFile(): Promise<ReturnsError<{ success: boolean }>> {
    return { result: { success: true } };
  }

  async readFile(): Promise<ReturnsError<Readable>> {
    return { result: new Readable() };
  }
}

class BlobAlreadyExistsObjectStore extends ObjectStore {
  constructor() {
    super("test-container");
  }

  async uploadFile(
    path: string,
    _stream: Readable,
  ): Promise<ReturnsError<{ success: boolean; url?: string }>> {
    return {
      error: new BlobAlreadyExistsError(path, "test-container"),
    };
  }

  async listFiles(): Promise<
    ReturnsError<
      Array<{ path: string; size?: number; metadata?: Record<string, string> }>
    >
  > {
    return { result: [] };
  }

  async deleteFile(): Promise<ReturnsError<{ success: boolean }>> {
    return { result: { success: true } };
  }

  async readFile(): Promise<ReturnsError<Readable>> {
    return { result: new Readable() };
  }
}

class InvalidUploadParamsObjectStore extends ObjectStore {
  constructor() {
    super("test-container");
  }

  async uploadFile(): Promise<ReturnsError<{ success: boolean; url?: string }>> {
    return {
      error: new InvalidUploadParamsError(),
    };
  }

  async listFiles(): Promise<
    ReturnsError<
      Array<{ path: string; size?: number; metadata?: Record<string, string> }>
    >
  > {
    return { result: [] };
  }

  async deleteFile(): Promise<ReturnsError<{ success: boolean }>> {
    return { result: { success: true } };
  }

  async readFile(): Promise<ReturnsError<Readable>> {
    return { result: new Readable() };
  }
}

class StorageErrorObjectStore extends ObjectStore {
  constructor() {
    super("test-container");
  }

  async uploadFile(): Promise<ReturnsError<{ success: boolean; url?: string }>> {
    return {
      error: new StorageError("Storage operation failed"),
    };
  }

  async listFiles(): Promise<
    ReturnsError<
      Array<{ path: string; size?: number; metadata?: Record<string, string> }>
    >
  > {
    return { result: [] };
  }

  async deleteFile(): Promise<ReturnsError<{ success: boolean }>> {
    return { result: { success: true } };
  }

  async readFile(): Promise<ReturnsError<Readable>> {
    return { result: new Readable() };
  }
}

class UploadFailedObjectStore extends ObjectStore {
  constructor() {
    super("test-container");
  }

  async uploadFile(): Promise<ReturnsError<{ success: boolean; url?: string }>> {
    return { result: undefined as any };
  }

  async listFiles(): Promise<
    ReturnsError<
      Array<{ path: string; size?: number; metadata?: Record<string, string> }>
    >
  > {
    return { result: [] };
  }

  async deleteFile(): Promise<ReturnsError<{ success: boolean }>> {
    return { result: { success: true } };
  }

  async readFile(): Promise<ReturnsError<Readable>> {
    return { result: new Readable() };
  }
}

class ListFilesErrorObjectStore extends ObjectStore {
  constructor() {
    super("test-container");
  }

  async uploadFile(
    path: string,
    _stream: Readable,
    metadata?: Record<string, string>,
  ): Promise<ReturnsError<{ success: boolean; url?: string }>> {
    return {
      result: {
        success: true,
        url: `https://mock-storage.blob.core.windows.net/test-container/${path}`,
      },
    };
  }

  async listFiles(): Promise<
    ReturnsError<
      Array<{ path: string; size?: number; metadata?: Record<string, string> }>
    >
  > {
    return { error: new Error("Failed to list files") };
  }

  async deleteFile(): Promise<ReturnsError<{ success: boolean }>> {
    return { result: { success: true } };
  }

  async readFile(): Promise<ReturnsError<Readable>> {
    return { result: new Readable() };
  }
}

class BackupNotFoundObjectStore extends ObjectStore {
  constructor() {
    super("test-container");
  }

  async uploadFile(
    path: string,
    _stream: Readable,
  ): Promise<ReturnsError<{ success: boolean; url?: string }>> {
    return {
      result: {
        success: true,
        url: `https://mock-storage.blob.core.windows.net/test-container/${path}`,
      },
    };
  }

  async listFiles(): Promise<
    ReturnsError<
      Array<{ path: string; size?: number; metadata?: Record<string, string> }>
    >
  > {
    return { result: [] };
  }

  async deleteFile(): Promise<ReturnsError<{ success: boolean }>> {
    return { result: { success: true } };
  }

  async readFile(): Promise<ReturnsError<Readable>> {
    return { result: new Readable() };
  }
}

describe("POST /backups", () => {
  let app: express.Express;
  let dbKey: symbol;
  let objectStore: FakeObjectStore;

  beforeEach(() => {
    dbKey = backupDb.connect();
    objectStore = new FakeObjectStore();
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

  it("should return 409 when backup already exists", async () => {
    const errorObjectStore = new BlobAlreadyExistsObjectStore();
    const errorApp = createBackupHttpApp({
      backupDbKey: dbKey,
      backupFn: async () => new Readable(),
      objectStore: errorObjectStore,
    });

    const response = await request(errorApp)
      .post("/backups")
      .set(makeAdminHeaders())
      .send({});

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      code: "BACKUP_ALREADY_EXISTS",
    });
  });

  it("should return 400 for invalid upload parameters", async () => {
    const errorObjectStore = new InvalidUploadParamsObjectStore();
    const errorApp = createBackupHttpApp({
      backupDbKey: dbKey,
      backupFn: async () => new Readable(),
      objectStore: errorObjectStore,
    });

    const response = await request(errorApp)
      .post("/backups")
      .set(makeAdminHeaders())
      .send({});

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      code: "INVALID_UPLOAD_PARAMS",
    });
  });

  it("should return 500 for storage error", async () => {
    const errorObjectStore = new StorageErrorObjectStore();
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
    const errorObjectStore = new UploadFailedObjectStore();
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
    const errorObjectStore = new ListFilesErrorObjectStore();
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
    const errorObjectStore = new BackupNotFoundObjectStore();
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
