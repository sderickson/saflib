[**@saflib/vendors-azure**](../index.md)

---

# index

## Classes

| Class                                                           | Description |
| --------------------------------------------------------------- | ----------- |
| [AzureContainerError](classes/AzureContainerError.md)           | -           |
| [AzureDeleteError](classes/AzureDeleteError.md)                 | -           |
| [AzureObjectStore](classes/AzureObjectStore.md)                 | -           |
| [BlobAlreadyExistsError](classes/BlobAlreadyExistsError.md)     | -           |
| [BlobNotFoundError](classes/BlobNotFoundError.md)               | -           |
| [ContainerCreationError](classes/ContainerCreationError.md)     | -           |
| [ContainerUpdateError](classes/ContainerUpdateError.md)         | -           |
| [InvalidUploadParamsError](classes/InvalidUploadParamsError.md) | -           |

## Interfaces

| Interface                                                        | Description |
| ---------------------------------------------------------------- | ----------- |
| [AzureObjectStoreOptions](interfaces/AzureObjectStoreOptions.md) | -           |
| [ContainerResult](interfaces/ContainerResult.md)                 | -           |
| [DeleteBlobParams](interfaces/DeleteBlobParams.md)               | -           |
| [DeleteBlobResult](interfaces/DeleteBlobResult.md)               | -           |
| [UploadFileParams](interfaces/UploadFileParams.md)               | -           |
| [UploadResult](interfaces/UploadResult.md)                       | -           |
| [UpsertContainerParams](interfaces/UpsertContainerParams.md)     | -           |

## Type Aliases

| Type Alias                                                   | Description |
| ------------------------------------------------------------ | ----------- |
| [ContainerAccessLevel](type-aliases/ContainerAccessLevel.md) | -           |

## Functions

| Function                                                      | Description                                                                                                          |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [createAzureObjectStore](functions/createAzureObjectStore.md) | Creates an Azure Blob Storage-backed ObjectStore. When NODE_ENV is "test", returns a cached TestObjectStore instead. |
| [deleteBlob](functions/deleteBlob.md)                         | -                                                                                                                    |
| [getBlobServiceClient](functions/getBlobServiceClient.md)     | -                                                                                                                    |
| [testAzureBlobStorage](functions/testAzureBlobStorage.md)     | -                                                                                                                    |
| [uploadFile](functions/uploadFile.md)                         | -                                                                                                                    |
| [upsertContainer](functions/upsertContainer.md)               | -                                                                                                                    |
