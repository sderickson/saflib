import { AsyncLocalStorage } from "async_hooks";
import type { DbKey } from "@saflib/drizzle";
import { backupDb } from "backup-db";

export interface BackupServiceContext {
  backupDbKey: DbKey;
}

export const backupServiceStorage =
  new AsyncLocalStorage<BackupServiceContext>();

export interface BackupServiceContextOptions {
  backupDbKey?: DbKey;
}

export const makeContext = (
  options: BackupServiceContextOptions = {},
): BackupServiceContext => {
  const dbKey = options.backupDbKey ?? backupDb.connect();
  return {
    backupDbKey: dbKey,
  };
};
