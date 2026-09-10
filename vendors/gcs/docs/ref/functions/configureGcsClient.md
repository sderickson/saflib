[**@saflib/vendors-gcs**](../index.md)

---

# Function: configureGcsClient()

> **configureGcsClient**(`options`): `void`

Configure the shared GCS client (e.g. service-account credentials from Infisical).
Clears any existing client so the next [getStorage](getStorage.md) uses the new options.

When never called, [getStorage](getStorage.md) falls back to Application Default Credentials
(metadata server or `GOOGLE_APPLICATION_CREDENTIALS` file).

## Parameters

| Parameter | Type             |
| --------- | ---------------- |
| `options` | `StorageOptions` |

## Returns

`void`
