import { createHandler } from "@saflib/express";
import type { BackupServiceResponseBody } from "@saflib/backup-spec";
import createError from "http-errors";
import { getSafContextWithAuth } from "@saflib/node";
import type { ObjectStore } from "@saflib/object-store";
import { mapObjectStoreFileToBackup } from "./_helpers.ts";

export const createListHandler = (objectStore: ObjectStore) => {
  return createHandler(async (_req, res) => {
    const { auth } = getSafContextWithAuth();

    if (!auth.userScopes.includes("*")) {
      const errorResponse: BackupServiceResponseBody["listBackups"][403] = {
        message: "Forbidden - admin access required",
        code: "FORBIDDEN",
      };
      res.status(403).json(errorResponse);
      return;
    }

    const { result: files, error } = await objectStore.listFiles();

    if (error) {
      throw createError(500, "Failed to list backup files", {
        code: "LIST_FILES_ERROR",
      });
    }

    const backups = files
      .filter((file: { path: string; size?: number; metadata?: Record<string, string> }) => file.path.endsWith(".db"))
      .map((file: { path: string; size?: number; metadata?: Record<string, string> }) => mapObjectStoreFileToBackup(file))
      .filter((backup: ReturnType<typeof mapObjectStoreFileToBackup>): backup is NonNullable<typeof backup> => backup !== null);

    const response: BackupServiceResponseBody["listBackups"][200] = backups;
    res.status(200).json(response);
  });
};
