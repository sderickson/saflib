import { describe, it, expect, beforeEach, afterEach } from "vitest";
import request from "supertest";
import express from "express";
import { Readable } from "stream";
import { createBackupHttpApp } from "../../http.ts";
import { makeUserHeaders, makeAdminHeaders } from "@saflib/express";
import { backupDb } from "@saflib/backup-db";
import { TestObjectStore, FileNotFoundError } from "@saflib/object-store";
import { tmpdir } from "os";
import { join } from "path";
import { unlinkSync, readFileSync } from "fs";
import Database from "better-sqlite3";
import type { ReturnsError } from "@saflib/monorepo";
import type { StorageError } from "@saflib/object-store";

class TestObjectStoreWithContent extends TestObjectStore {
  private fileContent: Map<string, Buffer> = new Map();

  setFileContent(path: string, content: Buffer): void {
    this.fileContent.set(path, content);
  }

  async readFile(
    path: string,
  ): Promise<ReturnsError<Readable, StorageError | FileNotFoundError>> {
    const baseResult = await super.readFile(path);
    if (baseResult.error) {
      return baseResult;
    }

    const content = this.fileContent.get(path);
    if (content) {
      return { result: Readable.from(content) };
    }

    return baseResult;
  }
}

describe("POST /backups/:backupId/restore", () => {
  let app: express.Express;
  let dbKey: symbol;
  let objectStore: TestObjectStoreWithContent;
  let dbPath: string | undefined;
  let tempFiles: string[] = [];

  beforeEach(() => {
    dbKey = backupDb.connect();
    objectStore = new TestObjectStoreWithContent();
    app = createBackupHttpApp({
      backupDbKey: dbKey,
      backupFn: async () => new Readable(),
      objectStore,
    });
  });

  afterEach(() => {
    backupDb.disconnect(dbKey);
    if (dbPath) {
      try {
        unlinkSync(dbPath);
      } catch {
        // Ignore errors when cleaning up
      }
      dbPath = undefined;
    }
    for (const file of tempFiles) {
      try {
        unlinkSync(file);
      } catch {
        // Ignore errors when cleaning up
      }
    }
    tempFiles = [];
  });

  it("should restore backup successfully", async () => {
    const tempBackupDbPath = join(tmpdir(), `test-backup-source-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
    tempFiles.push(tempBackupDbPath);
    
    const tempDb = new Database(tempBackupDbPath);
    tempDb.exec("CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)");
    tempDb.exec("INSERT INTO test (name) VALUES ('test')");
    tempDb.close();

    const backupContent = readFileSync(tempBackupDbPath);

    dbPath = join(tmpdir(), `test-restore-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
    tempFiles.push(dbPath);
    backupDb.disconnect(dbKey);
    dbKey = backupDb.connect({
      onDisk: dbPath,
      overrideTestDefault: true,
    });
    app = createBackupHttpApp({
      backupDbKey: dbKey,
      backupFn: async () => new Readable(),
      objectStore,
    });
    const timestamp = Date.now();
    const backupId = "test-backup-1";
    const backupPath = `backup-${timestamp}-manual-${backupId}.db`;

    objectStore.setFiles([
      {
        path: backupPath,
        size: backupContent.length,
        metadata: { source: "database" },
      },
    ]);
    objectStore.setFileContent(backupPath, backupContent);

    const response = await request(app)
      .post(`/backups/${backupId}/restore`)
      .set(makeAdminHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      message: "Backup restored successfully",
    });

    const files = objectStore.getFiles();
    expect(files.length).toBe(2);
    expect(files.some((f) => f.path === backupPath)).toBe(true);
    expect(files.some((f) => f.path.startsWith("backup-") && f.path.includes("-manual-") && f.path.endsWith(".db") && f.path !== backupPath)).toBe(true);
  });

  it("should return 403 for non-admin user", async () => {
    const timestamp = Date.now();
    const backupId = "test-backup-1";
    const backupPath = `backup-${timestamp}-manual-${backupId}.db`;

    objectStore.setFiles([
      {
        path: backupPath,
        size: 1024,
      },
    ]);

    const response = await request(app)
      .post(`/backups/${backupId}/restore`)
      .set(makeUserHeaders());

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("should return 404 when backup not found", async () => {
    objectStore.setFiles([]);

    const response = await request(app)
      .post("/backups/non-existent-backup/restore")
      .set(makeAdminHeaders());

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      code: "BACKUP_NOT_FOUND",
    });
  });

  it("should return 404 when backup file cannot be read", async () => {
    const timestamp = Date.now();
    const backupId = "test-backup-1";
    const backupPath = `backup-${timestamp}-manual-${backupId}.db`;

    objectStore.setFiles([
      {
        path: backupPath,
        size: 1024,
      },
    ]);

    objectStore.setReadShouldFail(new FileNotFoundError(backupPath));

    const response = await request(app)
      .post(`/backups/${backupId}/restore`)
      .set(makeAdminHeaders());

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      code: "BACKUP_NOT_FOUND",
    });
  });

  it("should return 401 when authentication is missing", async () => {
    const timestamp = Date.now();
    const backupId = "test-backup-1";
    const backupPath = `backup-${timestamp}-manual-${backupId}.db`;

    objectStore.setFiles([
      {
        path: backupPath,
        size: 1024,
      },
    ]);

    const response = await request(app)
      .post(`/backups/${backupId}/restore`);

    expect(response.status).toBe(401);
  });
});
