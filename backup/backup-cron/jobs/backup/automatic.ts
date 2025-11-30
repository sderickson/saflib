import { backupServiceStorage } from "@saflib/backup-service-common";
import { getSafReporters } from "@saflib/node";
import { randomUUID } from "crypto";
import { StorageError, PathTraversalError } from "@saflib/object-store";

export const automatic = async () => {
  const store = backupServiceStorage.getStore()!;
  const { backupFn, objectStore } = store;
  const { log, logError } = getSafReporters();

  if (!backupFn) {
    logError(new Error("backupFn is not configured"));
    return;
  }

  if (!objectStore) {
    logError(new Error("objectStore is not configured"));
    return;
  }

  const timestamp = Date.now();
  const uuid = randomUUID();
  const filename = `backup-${timestamp}-automatic-${uuid}.db`;

  log.info(`Starting automatic backup: ${filename}`);

  const stream = await backupFn();

  const { error: uploadError } = await objectStore.uploadFile(filename, stream, {});

  if (uploadError) {
    switch (true) {
      case uploadError instanceof StorageError:
        logError(
          new Error(`Failed to upload backup ${filename}: ${uploadError.message}`),
        );
        return;
      case uploadError instanceof PathTraversalError:
        logError(
          new Error(`Invalid backup path ${filename}: ${uploadError.message}`),
        );
        return;
      default:
        logError(uploadError);
        return;
    }
  }

  log.info(`Automatic backup completed successfully: ${filename}`);
};
