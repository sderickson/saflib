import { AsyncLocalStorage } from "async_hooks";
import type { DbKey } from "@saflib/drizzle";
import { backupDb } from "@saflib/backup-db";
import type { ObjectStore } from "@saflib/object-store";
import type { Readable } from "stream";

export interface BackupServiceContext {
  backupDbKey: DbKey;
}

export const backupServiceStorage =
  new AsyncLocalStorage<BackupServiceContext>();

export interface BackupServiceContextOptions {
  backupDbKey?: DbKey;
  backupFn?: () => Promise<Readable>;
  objectStore?: ObjectStore;
}

export const makeContext = (
  options: BackupServiceContextOptions = {},
): BackupServiceContext => {
  const dbKey = options.backupDbKey ?? backupDb.connect();
  return {
    backupDbKey: dbKey,
  };
};
