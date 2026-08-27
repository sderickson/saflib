export {
  AzureObjectStore,
  type AzureObjectStoreOptions,
  type ContainerAccessLevel,
} from "./AzureObjectStore.ts";
export { createAzureObjectStore } from "./createAzureObjectStore.ts";
export { getBlobServiceClient } from "./client.ts";
export {
  uploadFile,
  BlobAlreadyExistsError,
  InvalidUploadParamsError,
  type UploadFileParams,
  type UploadResult,
} from "./upload-file.ts";
export {
  deleteBlob,
  BlobNotFoundError,
  AzureDeleteError,
  type DeleteBlobParams,
  type DeleteBlobResult,
} from "./delete-blob.ts";
export {
  upsertContainer,
  ContainerCreationError,
  ContainerUpdateError,
  AzureContainerError,
  type UpsertContainerParams,
  type ContainerResult,
} from "./upsert-container.ts";
export { testAzureBlobStorage } from "./test.ts";
