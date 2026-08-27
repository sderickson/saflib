import type { ObjectStore } from "@saflib/object-store";
import { TestObjectStore } from "@saflib/object-store";
import {
  GcsObjectStore,
  type GcsObjectStoreOptions,
} from "./GcsObjectStore.ts";

/**
 * When NODE_ENV=test we substitute TestObjectStore and cache by bucket name
 * so multiple makeContext() calls with the same bucket share the same
 * in-memory store.
 */
const testStoreCache = new Map<string, TestObjectStore>();

/**
 * Creates a GCS-backed {@link ObjectStore}.
 * When NODE_ENV is "test", returns a cached {@link TestObjectStore} instead.
 */
export function createGcsObjectStore(
  options: GcsObjectStoreOptions,
): ObjectStore {
  if (process.env.NODE_ENV === "test") {
    const key = `gcs:${options.bucketName}`;
    let store = testStoreCache.get(key);
    if (!store) {
      store = new TestObjectStore();
      testStoreCache.set(key, store);
    }
    return store;
  }
  return new GcsObjectStore(options);
}
