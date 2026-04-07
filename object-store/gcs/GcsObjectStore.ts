import { Readable } from "stream";
import { pipeline } from "node:stream/promises";
import {
  ObjectStore,
  PathTraversalError,
  StorageError,
  FileNotFoundError,
} from "../ObjectStore.ts";
import { getStorage } from "./client.ts";
import { typedEnv } from "../env.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { getSafReporters } from "@saflib/node";

export interface GcsObjectStoreOptions {
  bucketName: string;
}

export class GcsObjectStore extends ObjectStore {
  protected readonly bucketName: string;

  constructor(options: GcsObjectStoreOptions) {
    super();
    this.bucketName = options.bucketName;
  }

  async uploadFile(
    path: string,
    stream: Readable,
    metadata?: Record<string, string>,
  ): Promise<ReturnsError<{ success: boolean; url?: string }>> {
    try {
      let objectName: string;
      try {
        objectName = this.getScopedPath(path);
      } catch (error) {
        if (error instanceof PathTraversalError) {
          return {
            error: new StorageError(
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

      if (typedEnv.NODE_ENV === "test") {
        return {
          result: {
            success: true,
            url: `https://storage.googleapis.com/${this.bucketName}/${objectName}`,
          },
        };
      }

      const storage = getStorage();
      const bucket = storage.bucket(this.bucketName);
      const file = bucket.file(objectName);

      try {
        await pipeline(
          stream,
          file.createWriteStream({
            metadata: {
              contentType: uploadMetadata.mimetype,
              metadata: {
                mimetype: uploadMetadata.mimetype,
                filename: uploadMetadata.filename,
                cacheTime: uploadMetadata.cacheTime,
              },
            },
          }),
        );
      } catch (error) {
        const { logError } = getSafReporters();
        logError(error);
        return {
          error: new StorageError(
            "Error uploading object",
            error instanceof Error ? error : undefined,
          ),
        };
      }

      return {
        result: {
          success: true,
          url: file.publicUrl(),
        },
      };
    } catch (error) {
      const { logError } = getSafReporters();
      logError(error);
      return {
        error: new StorageError(
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

      const storage = getStorage();
      const bucket = storage.bucket(this.bucketName);
      const searchPrefix = prefix ? this.getScopedPath(prefix) : undefined;

      const files: Array<{
        path: string;
        size?: number;
        metadata?: Record<string, string>;
      }> = [];

      const [objects] = await bucket.getFiles({ prefix: searchPrefix });
      for (const file of objects) {
        const meta = file.metadata.metadata as
          | Record<string, string>
          | undefined;
        files.push({
          path: file.name,
          size:
            file.metadata.size !== undefined
              ? Number(file.metadata.size)
              : undefined,
          metadata: meta,
        });
      }

      return { result: files };
    } catch (error) {
      const { logError } = getSafReporters();
      logError(error);
      return {
        error: new StorageError(
          "Error listing files",
          error instanceof Error ? error : undefined,
        ),
      };
    }
  }

  async deleteFile(path: string): Promise<ReturnsError<{ success: boolean }>> {
    try {
      let objectName: string;
      try {
        objectName = this.getScopedPath(path);
      } catch (error) {
        if (error instanceof PathTraversalError) {
          return {
            error: new StorageError(
              `Failed to delete file: ${error.message}`,
              error,
            ),
          };
        }
        throw error;
      }

      if (typedEnv.NODE_ENV === "test") {
        return { result: { success: true } };
      }

      const storage = getStorage();
      const file = storage.bucket(this.bucketName).file(objectName);

      const [exists] = await file.exists();
      if (!exists) {
        return {
          error: new StorageError(`Object not found: ${objectName}`),
        };
      }

      await file.delete();
      return { result: { success: true } };
    } catch (error) {
      const { logError } = getSafReporters();
      logError(error);
      return {
        error: new StorageError(
          "Error deleting file",
          error instanceof Error ? error : undefined,
        ),
      };
    }
  }

  async readFile(path: string): Promise<ReturnsError<Readable>> {
    try {
      let objectName: string;
      try {
        objectName = this.getScopedPath(path);
      } catch (error) {
        if (error instanceof PathTraversalError) {
          return {
            error: new StorageError(
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

      const storage = getStorage();
      const file = storage.bucket(this.bucketName).file(objectName);

      const [exists] = await file.exists();
      if (!exists) {
        return {
          error: new FileNotFoundError(path),
        };
      }

      return { result: file.createReadStream() };
    } catch (error) {
      const { logError } = getSafReporters();
      logError(error);
      return {
        error: new StorageError(
          "Error reading file",
          error instanceof Error ? error : undefined,
        ),
      };
    }
  }

  async upsertContainer(): Promise<
    ReturnsError<
      {
        success: boolean;
        created?: boolean;
        updated?: boolean;
        skipped?: boolean;
        url?: string;
      },
      StorageError
    >
  > {
    throw new Error("Not implemented");
  }
}
