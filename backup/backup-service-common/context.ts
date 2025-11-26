import { AsyncLocalStorage } from "async_hooks";
import type { ObjectStore } from "@saflib/object-store";
import type { Readable } from "stream";

export interface BackupServiceContext {
  backupFn?: () => Promise<Readable>;
  objectStore?: ObjectStore;
}

export const backupServiceStorage =
  new AsyncLocalStorage<BackupServiceContext>();

export interface BackupServiceContextOptions {
  backupFn?: () => Promise<Readable>;
  objectStore?: ObjectStore;
}

export const makeContext = (
  options: BackupServiceContextOptions = {},
): BackupServiceContext => {
  return {
    backupFn: options.backupFn,
    objectStore: options.objectStore,
  };
};
