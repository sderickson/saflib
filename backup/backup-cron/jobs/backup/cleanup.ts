import { backupServiceStorage } from "@saflib/backup-service-common";
import { getSafReporters } from "@saflib/node";
import { StorageError, PathTraversalError } from "@saflib/object-store";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export const cleanup = async () => {
  const store = backupServiceStorage.getStore()!;
  const { objectStore } = store;
  const { log, logError } = getSafReporters();

  if (!objectStore) {
    logError(new Error("objectStore is not configured"));
    return;
  }

  log.info("Starting cleanup of old automatic backups");

  const { result: files, error: listError } = await objectStore.listFiles();

  if (listError) {
    switch (true) {
      case listError instanceof StorageError:
        logError(
          new Error(`Failed to list backup files: ${listError.message}`),
        );
        return;
      case listError instanceof PathTraversalError:
        logError(
          new Error(`Invalid path when listing files: ${listError.message}`),
        );
        return;
      default:
        logError(listError);
        return;
    }
  }

  const now = Date.now();
  const cutoffTime = now - THIRTY_DAYS_MS;
  let deletedCount = 0;
  let skippedCount = 0;

  for (const file of files) {
    const filename = file.path.split("/").pop() || file.path;
    const match = filename.match(/^backup-(\d+)-automatic-(.+)\.db$/);

    if (!match) {
      continue;
    }

    const [, timestampStr] = match;
    const timestamp = parseInt(timestampStr, 10);

    if (isNaN(timestamp) || timestamp >= cutoffTime) {
      continue;
    }

    if (!file.size || file.size === 0) {
      log.info(
        `Skipping backup ${filename}: file appears to be empty or incomplete`,
      );
      skippedCount++;
      continue;
    }

    log.info(`Deleting old automatic backup: ${filename} (age: ${Math.round((now - timestamp) / (24 * 60 * 60 * 1000))} days)`);

    const { error: deleteError } = await objectStore.deleteFile(file.path);

    if (deleteError) {
      switch (true) {
        case deleteError instanceof StorageError:
          logError(
            new Error(`Failed to delete backup ${filename}: ${deleteError.message}`),
          );
          continue;
        case deleteError instanceof PathTraversalError:
          logError(
            new Error(`Invalid path when deleting ${filename}: ${deleteError.message}`),
          );
          continue;
        default:
          logError(deleteError);
          continue;
      }
    }

    deletedCount++;
  }

  log.info(
    `Cleanup completed: deleted ${deletedCount} old automatic backups, skipped ${skippedCount} incomplete backups`,
  );
};
