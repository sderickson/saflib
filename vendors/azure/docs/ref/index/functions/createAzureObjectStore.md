[**@saflib/vendors-azure**](../../index.md)

---

# Function: createAzureObjectStore()

> **createAzureObjectStore**(`options`): `ObjectStore`

Creates an Azure Blob Storage-backed ObjectStore.
When NODE_ENV is "test", returns a cached TestObjectStore instead.

## Parameters

| Parameter | Type                                                                  |
| --------- | --------------------------------------------------------------------- |
| `options` | [`AzureObjectStoreOptions`](../interfaces/AzureObjectStoreOptions.md) |

## Returns

`ObjectStore`
