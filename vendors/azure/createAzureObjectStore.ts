import type { ObjectStore } from "@saflib/object-store";
import { TestObjectStore } from "@saflib/object-store";
import {
  AzureObjectStore,
  type AzureObjectStoreOptions,
} from "./AzureObjectStore.ts";

/**
 * When NODE_ENV=test we substitute TestObjectStore and cache by container name
 * so multiple contexts with the same config share the same in-memory store.
 */
const testStoreCache = new Map<string, TestObjectStore>();

/**
 * Creates an Azure Blob Storage-backed {@link ObjectStore}.
 * When NODE_ENV is "test", returns a cached {@link TestObjectStore} instead.
 */
export function createAzureObjectStore(
  options: AzureObjectStoreOptions,
): ObjectStore {
  if (process.env.NODE_ENV === "test") {
    const key = `azure:${options.containerName}`;
    let store = testStoreCache.get(key);
    if (!store) {
      store = new TestObjectStore();
      testStoreCache.set(key, store);
    }
    return store;
  }
  return new AzureObjectStore(options);
}
