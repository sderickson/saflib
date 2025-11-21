import { typedEnv } from "../env.ts";
import { getBlobServiceClient } from "./client.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { getSafReporters } from "@saflib/node";
import { Readable } from "stream";
import type { AccessTier } from "@azure/storage-blob";

export interface UploadFileParams {
  containerName: string;
  blobName: string;
  tier?: AccessTier;
  buffer?: Buffer;
  stream?: Readable;
  metadata: {
    mimetype: string;
    filename: string;
    cacheTime: string;
  };
  force?: boolean;
}

export interface UploadResult {
  success: boolean;
  url?: string;
}

export class InvalidUploadParamsError extends Error {
  constructor() {
    super("Either buffer or stream must be provided, but not both");
    this.name = "InvalidUploadParamsError";
  }
}

export class BlobAlreadyExistsError extends Error {
  constructor(blobName: string, containerName: string) {
    super(
      `Blob ${blobName} already exists in container ${containerName}. Use force=true to overwrite.`,
    );
    this.name = "BlobAlreadyExistsError";
  }
}

export class StorageError extends Error {
  public readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = "AzureStorageError";
    this.cause = cause;
  }
}

export async function uploadFile({
  containerName,
  blobName,
  tier = "Hot",
  buffer,
  stream,
  metadata,
  force = false,
}: UploadFileParams): Promise<
  ReturnsError<
    UploadResult,
    InvalidUploadParamsError | BlobAlreadyExistsError | StorageError
  >
> {
  const { log, logError } = getSafReporters();

  if ((!buffer && !stream) || (buffer && stream)) {
    return {
      error: new InvalidUploadParamsError(),
    };
  }

  if (typedEnv.NODE_ENV === "test") {
    return {
      result: {
        success: true,
        url: `https://mock-storage.blob.core.windows.net/${containerName}/${blobName}`,
      },
    };
  }

  const blobServiceClient = getBlobServiceClient({ tier });
  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobClient = containerClient.getBlockBlobClient(blobName);

  if (!force) {
    try {
      const exists = await blobClient.exists();
      if (exists) {
        return {
          error: new BlobAlreadyExistsError(blobName, containerName),
        };
      }
    } catch (error) {
      logError(error);
      return {
        error: new StorageError(
          "Error checking if blob exists",
          error instanceof Error ? error : undefined,
        ),
      };
    }
  }

  const blobMetadata = {
    mimetype: metadata.mimetype,
    filename: metadata.filename,
    cacheTime: metadata.cacheTime,
  };

  try {
    if (buffer) {
      await blobClient.upload(buffer, buffer.length, {
        metadata: blobMetadata,
        blobHTTPHeaders: {
          blobContentType: metadata.mimetype,
        },
      });
    } else if (stream) {
      await blobClient.uploadStream(stream, undefined, undefined, {
        metadata: blobMetadata,
        blobHTTPHeaders: {
          blobContentType: metadata.mimetype,
        },
      });
    }

    log.info(
      `Blob ${blobName} uploaded successfully to container ${containerName}`,
    );
  } catch (error) {
    logError(error);
    return {
      error: new StorageError(
        "Error uploading blob",
        error instanceof Error ? error : undefined,
      ),
    };
  }

  return {
    result: {
      success: true,
      url: blobClient.url,
    },
  };
}

