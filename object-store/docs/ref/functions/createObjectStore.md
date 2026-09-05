[**@saflib/object-store**](../index.md)

---

# Function: createObjectStore()

> **createObjectStore**(`options`): [`ObjectStore`](../classes/ObjectStore.md)

Creates an ObjectStore instance. When NODE_ENV is "test", always returns a
TestObjectStore (in-memory) regardless of the requested type, so tests
don't write to disk. Stores are cached by container key so multiple contexts
with the same config share the same in-memory store.

For GCS use `@saflib/vendors-gcs`. For Azure use `@saflib/vendors-azure`.

## Parameters

| Parameter | Type                                                                      |
| --------- | ------------------------------------------------------------------------- |
| `options` | [`CreateObjectStoreOptions`](../type-aliases/CreateObjectStoreOptions.md) |

## Returns

[`ObjectStore`](../classes/ObjectStore.md)
