**@saflib/vendors-gcs**

---

# @saflib/vendors-gcs

## Classes

| Class                                       | Description |
| ------------------------------------------- | ----------- |
| [GcsObjectStore](classes/GcsObjectStore.md) | -           |

## Interfaces

| Interface                                                    | Description |
| ------------------------------------------------------------ | ----------- |
| [GcsObjectStoreOptions](interfaces/GcsObjectStoreOptions.md) | -           |

## Functions

| Function                                                  | Description                                                                                                                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [configureGcsClient](functions/configureGcsClient.md)     | Configure the shared GCS client (e.g. service-account credentials from Infisical). Clears any existing client so the next [getStorage](functions/getStorage.md) uses the new options. |
| [createGcsObjectStore](functions/createGcsObjectStore.md) | Creates a GCS-backed ObjectStore. When NODE_ENV is "test", returns a cached TestObjectStore instead.                                                                                  |
| [getStorage](functions/getStorage.md)                     | Shared Storage client. Uses options from [configureGcsClient](functions/configureGcsClient.md) when set, otherwise Application Default Credentials.                                   |
