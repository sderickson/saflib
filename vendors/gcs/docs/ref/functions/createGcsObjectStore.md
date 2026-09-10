[**@saflib/vendors-gcs**](../index.md)

---

# Function: createGcsObjectStore()

> **createGcsObjectStore**(`options`): `ObjectStore`

Creates a GCS-backed ObjectStore.
When NODE_ENV is "test", returns a cached TestObjectStore instead.

## Parameters

| Parameter | Type                                                              |
| --------- | ----------------------------------------------------------------- |
| `options` | [`GcsObjectStoreOptions`](../interfaces/GcsObjectStoreOptions.md) |

## Returns

`ObjectStore`
