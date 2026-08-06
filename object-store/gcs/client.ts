import { Storage, type StorageOptions } from "@google-cloud/storage";

let storage: Storage | undefined;
let configuredOptions: StorageOptions | undefined;

/**
 * Configure the shared GCS client (e.g. service-account credentials from Infisical).
 * Clears any existing client so the next {@link getStorage} uses the new options.
 *
 * When never called, {@link getStorage} falls back to Application Default Credentials
 * (metadata server or `GOOGLE_APPLICATION_CREDENTIALS` file).
 */
export function configureGcsClient(options: StorageOptions): void {
  configuredOptions = options;
  storage = undefined;
}

/** @internal */
export function resetGcsClientForTests(): void {
  configuredOptions = undefined;
  storage = undefined;
}

/**
 * Shared Storage client. Uses options from {@link configureGcsClient} when set,
 * otherwise Application Default Credentials.
 */
export function getStorage(): Storage {
  if (!storage) {
    storage = new Storage(configuredOptions);
  }
  return storage;
}
