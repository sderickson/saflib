import { createReadStream, existsSync } from "node:fs";
import { mkdir, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "stream";
import {
  ObjectStore,
  PathTraversalError,
  StorageError,
  FileNotFoundError,
} from "../ObjectStore.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { getSafReporters } from "@saflib/node";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";

export class DiskObjectStore extends ObjectStore {
  private readonly rootPath: string;

  constructor(rootPath: string) {
    super();
    this.rootPath = path.resolve(rootPath);
  }

  private resolvePath(relativePath: string): string {
    const normalized = this.getScopedPath(relativePath);
    const resolved = path.resolve(this.rootPath, normalized);
    const root = path.resolve(this.rootPath);
    const separator = path.sep;
    if (resolved !== root && !resolved.startsWith(root + separator)) {
      throw new PathTraversalError(relativePath);
    }
    return resolved;
  }

  async uploadFile(
    relativePath: string,
    stream: Readable,
    _metadata?: Record<string, string>,
  ): Promise<
    ReturnsError<
      { success: boolean; url?: string },
      PathTraversalError | StorageError
    >
  > {
    try {
      const filePath = this.resolvePath(relativePath);
      await mkdir(path.dirname(filePath), { recursive: true });
      const writeStream = createWriteStream(filePath, { flags: "w" });
      await pipeline(stream, writeStream);
      return {
        result: {
          success: true,
          url: `file://${filePath}`,
        },
      };
    } catch (error) {
      if (error instanceof PathTraversalError) {
        return {
          error: new StorageError(
            `Failed to upload file: ${error.message}`,
            error,
          ),
        };
      }
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
      Array<{ path: string; size?: number; metadata?: Record<string, string> }>,
      PathTraversalError | StorageError
    >
  > {
    try {
      let searchPrefix: string | undefined;
      if (prefix !== undefined && prefix !== "") {
        searchPrefix = this.getScopedPath(prefix);
      }

      const files: Array<{
        path: string;
        size?: number;
        metadata?: Record<string, string>;
      }> = [];

      const walk = async (dir: string, baseRelative: string): Promise<void> => {
        if (!existsSync(dir)) {
          return;
        }
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const relativePath = baseRelative
            ? `${baseRelative}/${entry.name}`
            : entry.name;
          if (searchPrefix !== undefined && !relativePath.startsWith(searchPrefix)) {
            continue;
          }
          const fullPath = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            await walk(fullPath, relativePath);
          } else if (entry.isFile()) {
            const stats = await stat(fullPath);
            files.push({
              path: relativePath,
              size: stats.size,
            });
          }
        }
      };

      await walk(this.rootPath, "");

      return { result: files };
    } catch (error) {
      if (error instanceof PathTraversalError) {
        return {
          error: new StorageError(
            `Failed to list files: ${error.message}`,
            error,
          ),
        };
      }
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

  async deleteFile(
    relativePath: string,
  ): Promise<
    ReturnsError<{ success: boolean }, PathTraversalError | StorageError>
  > {
    try {
      const filePath = this.resolvePath(relativePath);
      if (!existsSync(filePath)) {
        return { result: { success: true } };
      }
      await rm(filePath, { force: true });
      return { result: { success: true } };
    } catch (error) {
      if (error instanceof PathTraversalError) {
        return {
          error: new StorageError(
            `Failed to delete file: ${error.message}`,
            error,
          ),
        };
      }
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

  async readFile(
    relativePath: string,
  ): Promise<
    ReturnsError<
      Readable,
      PathTraversalError | StorageError | FileNotFoundError
    >
  > {
    try {
      const filePath = this.resolvePath(relativePath);
      if (!existsSync(filePath)) {
        return { error: new FileNotFoundError(relativePath) };
      }
      const stats = await stat(filePath);
      if (!stats.isFile()) {
        return { error: new FileNotFoundError(relativePath) };
      }
      const stream = createReadStream(filePath);
      return { result: stream as Readable };
    } catch (error) {
      if (error instanceof PathTraversalError) {
        return {
          error: new StorageError(
            `Failed to read file: ${error.message}`,
            error,
          ),
        };
      }
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
    try {
      const existed = existsSync(this.rootPath);
      await mkdir(this.rootPath, { recursive: true });
      return {
        result: {
          success: true,
          created: !existed,
          skipped: existed,
          url: `file://${this.rootPath}`,
        },
      };
    } catch (error) {
      const { logError } = getSafReporters();
      logError(error);
      return {
        error: new StorageError(
          "Error creating root directory",
          error instanceof Error ? error : undefined,
        ),
      };
    }
  }
}
