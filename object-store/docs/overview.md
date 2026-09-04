# Overview

`@saflib/object-store` defines a shared **object storage** interface for upload, list, read, and delete operations. SAF code depends on the abstract `ObjectStore` class; concrete backends live in this package (disk, test) or vendor packages (GCS, Azure).

## What this package provides

- **`ObjectStore`** — abstract base with path normalization and traversal checks
- **`DiskObjectStore`** — local filesystem backend for development and tests against real I/O
- **`TestObjectStore`** — in-memory store for unit tests (`setFiles` / `getFiles` helpers)
- **`createObjectStore`** — factory; returns `TestObjectStore` when `NODE_ENV=test` (cached by root path so parallel test contexts share state)

Shared error types: `PathTraversalError`, `StorageError`, `FileNotFoundError`. Methods return [`ReturnsError`](../utils/docs/overview.md) instead of throwing for expected failures.

## Vendor implementations

Cloud backends extend `ObjectStore` in vendor packages:

- [`@saflib/vendors-gcs`](../vendors/gcs/GcsObjectStore.ts) — Google Cloud Storage
- [`@saflib/vendors-azure`](../vendors/azure/AzureObjectStore.ts) — Azure Blob Storage

Use `createObjectStore({ type: "disk", rootPath })` locally; wire a vendor class in production service bootstrap.

## Integration

Backup restore, file uploads, and similar features accept an `ObjectStore` instance from service context. Tests use `TestObjectStore` automatically via `createObjectStore` without touching disk.
