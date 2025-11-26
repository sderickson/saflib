import { createErrorMiddleware, createGlobalMiddleware } from "@saflib/express";
import express from "express";
import {
  backupServiceStorage,
  type BackupServiceContextOptions,
} from "@saflib/backup-service-common";
import { createBackupsRouter } from "./routes/backups/index.ts";
import type { ObjectStore } from "@saflib/object-store";
import type { Readable } from "stream";

export function createBackupRouter(
  backupFn: () => Promise<Readable>,
  restoreFn: ((backupStream: Readable) => Promise<void>) | undefined,
  objectStore: ObjectStore,
) {
  return createBackupsRouter(backupFn, restoreFn, objectStore);
}

/**
 * Creates the HTTP server for the backup service.
 * Really only used in tests - actual usage should use the router.
 */
export function createBackupHttpApp(
  options: BackupServiceContextOptions,
) {
  const app = express();
  app.use(createGlobalMiddleware());
  app.set("trust proxy", 1);

  const context = {};
  app.use((_req, _res, next) => {
    backupServiceStorage.run(context, () => {
      next();
    });
  });

  if (options.backupFn && options.objectStore) {
    app.use(createBackupRouter(options.backupFn, options.restoreFn, options.objectStore));
  }

  app.use(createErrorMiddleware());

  return app;
}
