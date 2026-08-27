import type { ObjectStore } from "./ObjectStore.ts";
import { DiskObjectStore } from "./disk/DiskObjectStore.ts";
import { TestObjectStore } from "./test/TestObjectStore.ts";

export type CreateObjectStoreOptions =
  | { type: "disk"; rootPath: string }
  | { type: "test" };

/**
 * When NODE_ENV=test we substitute TestObjectStore and cache by container key
 * so that multiple makeContext() calls with the same root share the same
 * in-memory stores (e.g. test uploads via one context and app reads via another).
 */
const testStoreCache = new Map<string, TestObjectStore>();

function getTestStoreCacheKey(options: CreateObjectStoreOptions): string | null {
  if (options.type === "disk") return options.rootPath;
  return null;
}

/**
 * Creates an ObjectStore instance. When NODE_ENV is "test", always returns a
 * TestObjectStore (in-memory) regardless of the requested type, so tests
 * don't write to disk. Stores are cached by container key so multiple contexts
 * with the same config share the same in-memory store.
 *
 * For GCS use `@saflib/vendors-gcs`. For Azure use `@saflib/vendors-azure`.
 */
export function createObjectStore(
  options: CreateObjectStoreOptions,
): ObjectStore {
  if (process.env.NODE_ENV === "test") {
    const key = getTestStoreCacheKey(options);
    if (key) {
      let store = testStoreCache.get(key);
      if (!store) {
        store = new TestObjectStore();
        testStoreCache.set(key, store);
      }
      return store;
    }
    return new TestObjectStore();
  }
  switch (options.type) {
    case "disk":
      return new DiskObjectStore(options.rootPath);
    case "test":
      return new TestObjectStore();
    default: {
      const _: never = options;
      return _;
    }
  }
}
