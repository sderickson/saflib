import { createErrorMiddleware, createGlobalMiddleware } from "@saflib/express";
import express from "express";
import { backupDb } from "@saflib/backup-db";
import {
  backupServiceStorage,
  type BackupServiceContextOptions,
} from "@saflib/backup-service-common";

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

  // Add route handlers here. Do not prefix the routes; the router will handle the prefix.
  // app.use(createBackupRouter());

  app.use(createErrorMiddleware());

  return app;
}
