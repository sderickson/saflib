import { createHandler } from "@saflib/express";
import type {
  BackupServiceResponseBody,
} from "@saflib/backup-spec";
import createError from "http-errors";
import { getSafContextWithAuth } from "@saflib/node";
import type { ObjectStore } from "@saflib/object-store";
import {
  BlobAlreadyExistsError,
  InvalidUploadParamsError,
  StorageError,
} from "@saflib/object-store";
import type { Readable } from "stream";
import { randomUUID } from "crypto";
import { mapObjectStoreFileToBackup } from "./_helpers.ts";

type CreateBackupRequestBody = {
  description?: string;
  tags?: string[];
};

export const createCreateHandler = (
  backupFn: () => Promise<Readable>,
  objectStore: ObjectStore,
) => {
  return createHandler(async (req, res) => {
    const { auth } = getSafContextWithAuth();

    if (!auth.userScopes.includes("*")) {
      const errorResponse: BackupServiceResponseBody["createBackup"][403] = {
        message: "Forbidden - admin access required",
        code: "FORBIDDEN",
      };
      res.status(403).json(errorResponse);
      return;
    }

    const data: CreateBackupRequestBody = (req.body || {}) as CreateBackupRequestBody;

    const stream = await backupFn();

    const timestamp = Date.now();
    const uuid = randomUUID();
    const filename = `backup-${timestamp}-manual-${uuid}.db`;

    const metadata: Record<string, string> = {};
    if (data.description) {
      metadata.description = data.description;
    }
    if (data.tags && data.tags.length > 0) {
      metadata.tags = JSON.stringify(data.tags);
    }

    const { result: uploadResult, error: uploadError } =
      await objectStore.uploadFile(filename, stream, metadata);

    if (uploadError) {
      if (uploadError instanceof BlobAlreadyExistsError) {
        throw createError(409, "Backup with this ID already exists", {
          code: "BACKUP_ALREADY_EXISTS",
        });
      }
      if (uploadError instanceof InvalidUploadParamsError) {
        throw createError(400, "Invalid upload parameters", {
          code: "INVALID_UPLOAD_PARAMS",
        });
      }
      if (uploadError instanceof StorageError) {
        throw createError(500, "Failed to upload backup", {
          code: "STORAGE_ERROR",
        });
      }
      throw createError(500, "Unexpected upload error", {
        code: "UNEXPECTED_UPLOAD_ERROR",
      });
    }

    if (!uploadResult) {
      throw createError(500, "Upload failed", {
        code: "UPLOAD_FAILED",
      });
    }

    const { result: files, error: listError } = await objectStore.listFiles();

    if (listError) {
      throw createError(500, "Failed to list backup files", {
        code: "LIST_FILES_ERROR",
      });
    }

    const uploadedFile = files.find((file) => file.path === filename);

    if (!uploadedFile) {
      throw createError(500, "Failed to retrieve uploaded backup", {
        code: "BACKUP_NOT_FOUND",
      });
    }

    const backup = mapObjectStoreFileToBackup(uploadedFile);

    if (!backup) {
      throw createError(500, "Failed to parse backup metadata", {
        code: "BACKUP_PARSE_ERROR",
      });
    }

    const response: BackupServiceResponseBody["createBackup"][201] = backup;
    res.status(201).json(response);
  });
};
