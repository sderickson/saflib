# Overview

`@saflib/vendors-gcs` implements [`ObjectStore`](../../../object-store/docs/01-overview.md) against [Google Cloud Storage](https://cloud.google.com/storage).

## What this package provides

- **`GcsObjectStore`** — upload, list, read, and delete with path traversal checks
- **`createGcsObjectStore({ bucketName })`** — factory; returns `TestObjectStore` when `NODE_ENV=test`
- **`configureGcsClient(options)` / `getStorage()`** — shared GCS client; optional explicit credentials or Application Default Credentials

## Integration

Wire `createGcsObjectStore({ bucketName })` in production service bootstrap and pass the instance through service context (backup restore, file uploads, etc.).

Credentials:

- Call `configureGcsClient()` with service-account options from your secret store, **or**
- Rely on Application Default Credentials (`GOOGLE_APPLICATION_CREDENTIALS` or GCE/GKE metadata)

Local development typically uses [`DiskObjectStore`](../../../object-store/docs/01-overview.md) via `createObjectStore({ type: "disk", rootPath })`.

Azure Blob Storage alternative: [`@saflib/vendors-azure`](../../azure/docs/01-overview.md).
