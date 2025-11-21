import express from "express";
import { createScopedMiddleware } from "@saflib/express";
import { jsonSpec } from "@saflib/backup-spec";
import { createListHandler } from "./list.ts";
import type { ObjectStore } from "@saflib/object-store";
import type { Readable } from "stream";

export const createBackupsRouter = (
  _backupFn: () => Promise<Readable>,
  objectStore: ObjectStore,
) => {
  const router = express.Router();

  router.use(
    createScopedMiddleware({
      apiSpec: jsonSpec,
    }),
  );

  router.get("/backups", createListHandler(objectStore));

  return router;
};
