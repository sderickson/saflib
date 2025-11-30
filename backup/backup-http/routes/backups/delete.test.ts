import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import { Readable } from "stream";
import { createBackupHttpApp } from "../../http.ts";
import { makeUserHeaders, makeAdminHeaders } from "@saflib/express";
import { TestObjectStore } from "@saflib/object-store";

describe("DELETE /backups/:backupId", () => {
  let app: express.Express;
  let objectStore: TestObjectStore;

  beforeEach(() => {
    objectStore = new TestObjectStore();
    app = createBackupHttpApp({
      backupFn: async () => new Readable(),
      objectStore,
    });
  });

  it("should delete backup successfully", async () => {
    const timestamp = Date.now();
    const backupId = "test-backup-1";
    const backupPath = `backup-${timestamp}-manual-${backupId}.db`;
    
    objectStore.setFiles([
      {
        path: backupPath,
        size: 1024,
        metadata: { source: "database" },
      },
    ]);

    const response = await request(app)
      .delete(`/backups/${backupId}`)
      .set(makeAdminHeaders());

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      success: true,
      message: "Backup deleted successfully",
    });
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
      .delete(`/backups/${backupId}`)
      .set(makeUserHeaders());

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("should return 404 when backup not found", async () => {
    objectStore.setFiles([]);

    const response = await request(app)
      .delete("/backups/non-existent-backup")
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

    const response = await request(app).delete(`/backups/${backupId}`);

    expect(response.status).toBe(401);
  });
});
