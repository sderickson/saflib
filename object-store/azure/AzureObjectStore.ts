import { Readable } from "stream";
import { ObjectStore, PathTraversalError } from "../ObjectStore.ts";
import { getBlobServiceClient } from "./client.ts";
import { uploadFile } from "./upload-file.ts";
import { deleteBlob } from "./delete-blob.ts";
import { typedEnv } from "../env.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { getSafReporters } from "@saflib/node";
import type { AccessTier } from "@azure/storage-blob";

export class AzureStorageError extends Error {
  public readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = "AzureStorageError";
    this.cause = cause;
  }
}

export class AzureObjectStore extends ObjectStore {
  protected readonly containerName: string;
  protected readonly tier: AccessTier;

  constructor(
    containerName: string,
    folderPath: string = "",
    tier: AccessTier = "Hot",
  ) {
    super(folderPath);
    this.containerName = containerName;
    this.tier = tier;
  }
  async uploadFile(
    path: string,
    stream: Readable,
    metadata?: Record<string, string>,
  ): Promise<ReturnsError<{ success: boolean; url?: string }>> {
    try {
      let blobName: string;
      try {
        blobName = this.getScopedPath(path);
      } catch (error) {
        if (error instanceof PathTraversalError) {
          return {
            error: new AzureStorageError(
              `Failed to upload file: ${error.message}`,
              error,
            ),
          };
        }
        throw error;
      }

      const uploadMetadata = {
        mimetype: metadata?.mimetype || "application/octet-stream",
        filename: metadata?.filename || path.split("/").pop() || path,
        cacheTime: metadata?.cacheTime || new Date().toISOString(),
        ...metadata,
      };

      const result = await uploadFile({
        containerName: this.containerName,
        blobName,
        tier: this.tier,
        stream,
        metadata: {
          mimetype: uploadMetadata.mimetype,
          filename: uploadMetadata.filename,
          cacheTime: uploadMetadata.cacheTime,
        },
        force: true,
      });

      if ("error" in result && result.error) {
        return {
          error: new AzureStorageError(
            `Failed to upload file: ${result.error.message}`,
            result.error,
          ),
        };
      }

      return result;
    } catch (error) {
      const { logError } = getSafReporters();
      logError(error);
      return {
        error: new AzureStorageError(
          "Error uploading file",
          error instanceof Error ? error : undefined,
        ),
      };
    }
  }

  async listFiles(
    prefix?: string,
  ): Promise<
    ReturnsError<
      Array<{ path: string; size?: number; metadata?: Record<string, string> }>
    >
  > {
    try {
      if (typedEnv.NODE_ENV === "test") {
        return { result: [] };
      }

      const blobServiceClient = getBlobServiceClient({ tier: this.tier });
      const containerClient = blobServiceClient.getContainerClient(
        this.containerName,
      );

      const searchPrefix = prefix
        ? this.getScopedPath(prefix)
        : this.folderPath;

      const files: Array<{
        path: string;
        size?: number;
        metadata?: Record<string, string>;
      }> = [];

      for await (const blob of containerClient.listBlobsFlat({
        prefix: searchPrefix,
      })) {
        if (!blob.name.startsWith(this.folderPath)) {
          continue;
        }

        const relativePath = this.folderPath
          ? blob.name.slice(this.folderPath.length + 1)
          : blob.name;

        files.push({
          path: relativePath,
          size: blob.properties.contentLength,
          metadata: blob.metadata,
        });
      }

      return { result: files };
    } catch (error) {
      const { logError } = getSafReporters();
      logError(error);
      return {
        error: new AzureStorageError(
          "Error listing files",
          error instanceof Error ? error : undefined,
        ),
      };
    }
  }

  async deleteFile(
    path: string,
  ): Promise<ReturnsError<{ success: boolean }>> {
    try {
      let blobName: string;
      try {
        blobName = this.getScopedPath(path);
      } catch (error) {
        if (error instanceof PathTraversalError) {
          return {
            error: new AzureStorageError(
              `Failed to delete file: ${error.message}`,
              error,
            ),
          };
        }
        throw error;
      }

      const result = await deleteBlob({
        containerName: this.containerName,
        blobName,
        tier: this.tier,
      });

      if ("error" in result && result.error) {
        return {
          error: new AzureStorageError(
            `Failed to delete file: ${result.error.message}`,
            result.error,
          ),
        };
      }

      return result;
    } catch (error) {
      const { logError } = getSafReporters();
      logError(error);
      return {
        error: new AzureStorageError(
          "Error deleting file",
          error instanceof Error ? error : undefined,
        ),
      };
    }
  }

  async readFile(path: string): Promise<ReturnsError<Readable>> {
    try {
      let blobName: string;
      try {
        blobName = this.getScopedPath(path);
      } catch (error) {
        if (error instanceof PathTraversalError) {
          return {
            error: new AzureStorageError(
              `Failed to read file: ${error.message}`,
              error,
            ),
          };
        }
        throw error;
      }

      if (typedEnv.NODE_ENV === "test") {
        return { result: new Readable() };
      }
      const blobServiceClient = getBlobServiceClient({ tier: this.tier });
      const containerClient = blobServiceClient.getContainerClient(
        this.containerName,
      );
      const blobClient = containerClient.getBlockBlobClient(blobName);

      const exists = await blobClient.exists();
      if (!exists) {
        return {
          error: new AzureStorageError(`File not found: ${path}`),
        };
      }

      const downloadResponse = await blobClient.download();
      if (!downloadResponse.readableStreamBody) {
        return {
          error: new AzureStorageError(`Failed to read file: ${path}`),
        };
      }

      const webStream = downloadResponse.readableStreamBody as unknown as import("stream/web").ReadableStream<any>;
      return { result: Readable.fromWeb(webStream) };
    } catch (error) {
      const { logError } = getSafReporters();
      logError(error);
      return {
        error: new AzureStorageError(
          "Error reading file",
          error instanceof Error ? error : undefined,
        ),
      };
    }
  }
}
