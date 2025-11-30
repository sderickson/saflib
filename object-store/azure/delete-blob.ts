import type { AccessTier } from "@azure/storage-blob";
import { typedEnv } from "../env.ts";
import { getBlobServiceClient } from "./client.ts";
import type { ReturnsError } from "@saflib/monorepo";

export interface DeleteBlobParams {
  tier?: AccessTier;
  containerName: string;
  blobName: string;
}

export interface DeleteBlobResult {
  success: boolean;
}

export class BlobNotFoundError extends Error {
  constructor(blobName: string, containerName: string) {
    super(`Blob ${blobName} not found in container ${containerName}`);
    this.name = "BlobNotFoundError";
  }
}

export class AzureDeleteError extends Error {
  constructor(message: string, cause?: Error) {
    super(message);
    this.name = "AzureDeleteError";
    this.cause = cause;
  }
}

export async function deleteBlob({
  containerName,
  blobName,
  tier = "Hot",
}: DeleteBlobParams): Promise<
  ReturnsError<DeleteBlobResult, BlobNotFoundError | AzureDeleteError>
> {
  try {
    if (typedEnv.NODE_ENV === "test") {
      return {
        result: {
          success: true,
        },
      };
    }

    const blobServiceClient = getBlobServiceClient({ tier });

    const containerClient = blobServiceClient.getContainerClient(containerName);

    const blobClient = containerClient.getBlockBlobClient(blobName);

    try {
      const exists = await blobClient.exists();
      if (!exists) {
        return {
          error: new BlobNotFoundError(blobName, containerName),
        };
      }
    } catch (error) {
      console.warn("Could not check blob existence:", error);
    }

    await blobClient.delete();

    return {
      result: {
        success: true,
      },
    };
  } catch (error) {
    return {
      error: new AzureDeleteError(
        error instanceof Error ? error.message : "Unknown error occurred",
        error instanceof Error ? error : undefined,
      ),
    };
  }
}

