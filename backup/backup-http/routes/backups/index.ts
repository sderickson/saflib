import express from "express";
import { createScopedMiddleware } from "@saflib/express";
import { jsonSpec } from "@saflib/backup-spec";
import { createListHandler } from "./list.ts";
import { createCreateHandler } from "./create.ts";
import { createDeleteHandler } from "./delete.ts";
import { createRestoreHandler } from "./restore.ts";
import type { ObjectStore } from "@saflib/object-store";
import type { Readable } from "stream";

export const createBackupsRouter = (
  backupFn: () => Promise<Readable>,
  objectStore: ObjectStore,
) => {
  const router = express.Router();

  router.use(
    createScopedMiddleware({
      apiSpec: jsonSpec,
    }),
  );

  router.get("/backups", createListHandler(objectStore));
  router.post("/backups", createCreateHandler(backupFn, objectStore));
  router.post("/backups/:backupId/restore", createRestoreHandler(backupFn, objectStore));
  router.delete("/backups/:backupId", createDeleteHandler(objectStore));

  return router;
};
