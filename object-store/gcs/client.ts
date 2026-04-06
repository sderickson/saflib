import { Storage } from "@google-cloud/storage";

let storage: Storage | undefined;

/**
 * Shared Storage client using Application Default Credentials (e.g. GCE/GKE metadata).
 */
export function getStorage(): Storage {
  if (!storage) {
    storage = new Storage();
  }
  return storage;
}
