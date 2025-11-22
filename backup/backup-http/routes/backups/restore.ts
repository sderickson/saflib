import { createHandler } from "@saflib/express";
import type { BackupServiceResponseBody } from "@saflib/backup-spec";
import createError from "http-errors";
import { backupServiceStorage } from "@saflib/backup-service-common";
import { getSafContextWithAuth } from "@saflib/node";
import { backupDb } from "@saflib/backup-db";
import type { ObjectStore } from "@saflib/object-store";
import {
  PathTraversalError,
  StorageError,
  FileNotFoundError,
} from "@saflib/object-store";
import type { Readable } from "stream";
import { randomUUID } from "crypto";
import { mapObjectStoreFileToBackup } from "./_helpers.ts";

export const createRestoreHandler = (
  backupFn: () => Promise<Readable>,
  objectStore: ObjectStore,
) => {
  return createHandler(async (req, res) => {
    const ctx = backupServiceStorage.getStore()!;
    const { auth } = getSafContextWithAuth();

    if (!auth.userScopes.includes("*")) {
      const errorResponse: BackupServiceResponseBody["restoreBackup"][403] = {
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
      const errorResponse: BackupServiceResponseBody["restoreBackup"][404] = {
        message: "Backup not found",
        code: "BACKUP_NOT_FOUND",
      };
      res.status(404).json(errorResponse);
      return;
    }

    const safetyBackupStream = await backupFn();

    const timestamp = Date.now();
    const uuid = randomUUID();
    const safetyBackupFilename = `backup-${timestamp}-manual-${uuid}.db`;

    const { error: uploadError } =
      await objectStore.uploadFile(safetyBackupFilename, safetyBackupStream, {
        description: "Safety backup before restore",
      });

    if (uploadError) {
      switch (true) {
        case uploadError instanceof StorageError:
          throw createError(500, uploadError.message, {
            code: "STORAGE_ERROR",
          });
        case uploadError instanceof PathTraversalError:
          res.status(400).json({
            message: uploadError.message,
            code: "INVALID_PATH",
          });
          return;
        default:
          throw uploadError satisfies never;
      }
    }

    const { result: backupStream, error: readError } =
      await objectStore.readFile(backup.path);

    if (readError) {
      switch (true) {
        case readError instanceof FileNotFoundError:
          const errorResponse: BackupServiceResponseBody["restoreBackup"][404] = {
            message: "Backup file not found",
            code: "BACKUP_NOT_FOUND",
          };
          res.status(404).json(errorResponse);
          return;
        case readError instanceof StorageError:
          throw createError(500, readError.message, {
            code: "STORAGE_ERROR",
          });
        case readError instanceof PathTraversalError:
          res.status(400).json({
            message: readError.message,
            code: "INVALID_PATH",
          });
          return;
        default:
          throw readError satisfies never;
      }
    }

    if (!backupStream) {
      throw createError(500, "Failed to read backup file", {
        code: "READ_BACKUP_ERROR",
      });
    }

    await backupDb.restore(ctx.backupDbKey, backupStream);

    const response: BackupServiceResponseBody["restoreBackup"][200] = {
      success: true,
      message: "Backup restored successfully",
    };
    res.status(200).json(response);
  });
};
