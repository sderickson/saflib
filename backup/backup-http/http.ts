import { createErrorMiddleware, createGlobalMiddleware } from "@saflib/express";
import express from "express";
import { backupDb } from "@saflib/backup-db";
import {
  backupServiceStorage,
  type BackupServiceContextOptions,
} from "@saflib/backup-service-common";
import { createBackupsRouter } from "./routes/backups/index.ts";
import type { ObjectStore } from "@saflib/object-store";
import type { Readable } from "stream";

export function createBackupRouter(
  backupFn: () => Promise<Readable>,
  objectStore: ObjectStore,
) {
  return createBackupsRouter(backupFn, objectStore);
}

/**
 * Creates the HTTP server for the backup service.
 */
export function createBackupHttpApp(
  options: BackupServiceContextOptions,
) {
  let dbKey = options.backupDbKey;
  if (!dbKey) {
    dbKey = backupDb.connect();
  }

  const app = express();
  app.use(createGlobalMiddleware());
  app.set("trust proxy", 1);

  const context = { backupDbKey: dbKey };
  app.use((_req, _res, next) => {
    backupServiceStorage.run(context, () => {
      next();
    });
  });

  if (options.backupFn && options.objectStore) {
    app.use(createBackupRouter(options.backupFn, options.objectStore));
  }

  app.use(createErrorMiddleware());

  return app;
}
