import { AsyncLocalStorage } from "async_hooks";
import type { ObjectStore } from "@saflib/object-store";
import type { Readable } from "stream";

export interface BackupServiceContext {
  backupFn?: () => Promise<Readable>;
  restoreFn?: (backupStream: Readable) => Promise<void>;
  objectStore?: ObjectStore;
}

export const backupServiceStorage =
  new AsyncLocalStorage<BackupServiceContext>();

export interface BackupServiceContextOptions {
  backupFn?: () => Promise<Readable>;
  restoreFn?: (backupStream: Readable) => Promise<void>;
  objectStore?: ObjectStore;
}

export const makeContext = (
  options: BackupServiceContextOptions = {},
): BackupServiceContext => {
  return {
    backupFn: options.backupFn,
    restoreFn: options.restoreFn,
    objectStore: options.objectStore,
  };
};
