import { createHandler } from "@saflib/express";
import type { BackupServiceResponseBody } from "@saflib/backup-spec";
import createError from "http-errors";
import { getSafContextWithAuth } from "@saflib/node";
import type { ObjectStore } from "@saflib/object-store";
import {
  PathTraversalError,
  StorageError,
} from "@saflib/object-store";
import { mapObjectStoreFileToBackup } from "./_helpers.ts";

export const createDeleteHandler = (objectStore: ObjectStore) => {
  return createHandler(async (req, res) => {
    const { auth } = getSafContextWithAuth();

    if (!auth.userScopes.includes("*")) {
      const errorResponse: BackupServiceResponseBody["deleteBackup"][403] = {
        message: "Forbidden - admin access required",
        code: "FORBIDDEN",
      };
      res.status(403).json(errorResponse);
      return;
    }

    const backupId = req.params.backupId;

    if (!backupId) {
      throw createError(400, "Backup ID is required", {
        code: "BACKUP_ID_REQUIRED",
      });
    }

    const { result: files, error: listError } = await objectStore.listFiles();

    if (listError) {
      throw createError(500, "Failed to list backup files", {
        code: "LIST_FILES_ERROR",
      });
    }

    const backups = files
      .filter((file: { path: string; size?: number; metadata?: Record<string, string> }) => file.path.endsWith(".db"))
      .map((file: { path: string; size?: number; metadata?: Record<string, string> }) => mapObjectStoreFileToBackup(file))
      .filter((backup: ReturnType<typeof mapObjectStoreFileToBackup>): backup is NonNullable<typeof backup> => backup !== null);

    const backup = backups.find((b) => b.id === backupId);

    if (!backup) {
      const errorResponse: BackupServiceResponseBody["deleteBackup"][404] = {
        message: "Backup not found",
        code: "BACKUP_NOT_FOUND",
      };
      res.status(404).json(errorResponse);
      return;
    }

    if (backup.type !== "manual") {
      res.status(400).json({
        message: "Only manual backups can be deleted",
        code: "AUTOMATIC_BACKUP_CANNOT_BE_DELETED",
      });
      return;
    }

    const { error: deleteError } = await objectStore.deleteFile(backup.path);

    if (deleteError) {
      switch (true) {
        case deleteError instanceof StorageError:
          throw createError(500, deleteError.message, {
            code: "STORAGE_ERROR",
          });
        case deleteError instanceof PathTraversalError:
          res.status(400).json({
            message: deleteError.message,
            code: "INVALID_PATH",
          });
          return;
        default:
          throw deleteError satisfies never;
      }
    }

    const response: BackupServiceResponseBody["deleteBackup"][200] = {
      success: true,
      message: "Backup deleted successfully",
    };
    res.status(200).json(response);
  });
};
