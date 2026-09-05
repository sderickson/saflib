# Overview

`@saflib/vendors-azure` implements [`ObjectStore`](../../../object-store/docs/01-overview.md) against [Azure Blob Storage](https://azure.microsoft.com/products/storage/blobs).

## What this package provides

- **`AzureObjectStore`** — upload, list, read, and delete with path traversal checks; supports access tier and container ACL options
- **`createAzureObjectStore({ containerName, tier, accessLevel })`** — factory; returns `TestObjectStore` when `NODE_ENV=test`
- **Blob helpers** — `uploadFile`, `deleteBlob`, `upsertContainer` for direct SDK operations outside the `ObjectStore` interface

## Integration

Wire `createAzureObjectStore(...)` in production service bootstrap and pass the instance through service context.

Environment (see `env.schema.json`):

- **`AZURE_HOT_BLOB_STORAGE_URL`** — account URL for Hot tier
- **`AZURE_COOL_BLOB_STORAGE_URL`** — account URL for Cool tier
- **`AZURE_COLD_BLOB_STORAGE_URL`** — account URL for Cold tier

The shared blob client uses Azure credential chain (managed identity, env vars, etc.) via `@azure/identity`.

Local development typically uses [`DiskObjectStore`](../../../object-store/docs/01-overview.md). GCS alternative: [`@saflib/vendors-gcs`](../../gcs/docs/01-overview.md).
