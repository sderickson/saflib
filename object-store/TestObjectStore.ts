import { Readable } from "stream";
import { buffer as streamToBuffer } from "node:stream/consumers";
import { ObjectStore } from "./ObjectStore.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { StorageError, FileNotFoundError } from "./ObjectStore.ts";
import {
  BlobAlreadyExistsError,
  InvalidUploadParamsError,
} from "./azure/upload-file.ts";

export interface TestFile {
  path: string;
  size?: number;
  metadata?: Record<string, string>;
}

export class TestObjectStore extends ObjectStore {
  private files: TestFile[] = [];
  /** Stored content for each path so readFile returns real data */
  private contentMap = new Map<string, Buffer>();
  private uploadShouldFail = false;
  private uploadError?: Error;
  private listShouldFail = false;
  private listError?: Error;
  private deleteShouldFail = false;
  private deleteError?: Error;
  private readShouldFail = false;
  private readError?: Error;

  constructor() {
    super();
  }

  public normalizePath(path: string): string {
    return super.normalizePath(path);
  }

  public validatePath(path: string): string {
    return super.validatePath(path);
  }

  public getScopedPath(path: string): string {
    return super.getScopedPath(path);
  }

  setFiles(files: TestFile[]): void {
    this.files = files;
    this.contentMap.clear();
  }

  getFiles(): TestFile[] {
    return [...this.files];
  }

  setUploadShouldFail(error?: Error): void {
    this.uploadShouldFail = true;
    this.uploadError = error;
  }

  setListShouldFail(error?: Error): void {
    this.listShouldFail = true;
    this.listError = error;
  }

  setDeleteShouldFail(error?: Error): void {
    this.deleteShouldFail = true;
    this.deleteError = error;
  }

  setReadShouldFail(error?: Error): void {
    this.readShouldFail = true;
    this.readError = error;
  }

  reset(): void {
    this.files = [];
    this.contentMap.clear();
    this.uploadShouldFail = false;
    this.uploadError = undefined;
    this.listShouldFail = false;
    this.listError = undefined;
    this.deleteShouldFail = false;
    this.deleteError = undefined;
    this.readShouldFail = false;
    this.readError = undefined;
  }

  async uploadFile(
    path: string,
    stream: Readable,
    metadata?: Record<string, string>,
  ): Promise<ReturnsError<{ success: boolean; url?: string }, StorageError>> {
    if (this.uploadShouldFail) {
      if (
        this.uploadError instanceof BlobAlreadyExistsError ||
        this.uploadError instanceof InvalidUploadParamsError
      ) {
        return {
          error: new StorageError(this.uploadError.message, this.uploadError),
        };
      }
      return {
        error:
          this.uploadError instanceof StorageError
            ? this.uploadError
            : new StorageError(
                this.uploadError?.message || "Upload failed",
                this.uploadError,
              ),
      };
    }

    const existingFile = this.files.find((f) => f.path === path);
    if (existingFile) {
      return {
        error: new StorageError(
          `Blob ${path} already exists in container test-container. Use force=true to overwrite.`,
        ),
      };
    }

    let content: Buffer;
    try {
      content = await streamToBuffer(stream);
    } catch (error) {
      return {
        error: new StorageError(
          "Error reading upload stream",
          error instanceof Error ? error : undefined,
        ),
      };
    }

    this.contentMap.set(path, content);
    this.files.push({
      path,
      size: content.length,
      metadata,
    });

    return {
      result: {
        success: true,
        url: `https://mock-storage.blob.core.windows.net/test-container/${path}`,
      },
    };
  }

  async listFiles(
    prefix?: string,
  ): Promise<
    ReturnsError<
      Array<{ path: string; size?: number; metadata?: Record<string, string> }>,
      StorageError
    >
  > {
    if (this.listShouldFail) {
      return {
        error:
          this.listError instanceof StorageError
            ? this.listError
            : new StorageError(
                this.listError?.message || "List files failed",
                this.listError,
              ),
      };
    }

    let filteredFiles = this.files;
    if (prefix) {
      filteredFiles = this.files.filter((f) => f.path.startsWith(prefix));
    }

    return { result: filteredFiles };
  }

  async deleteFile(
    path: string,
  ): Promise<ReturnsError<{ success: boolean }, StorageError>> {
    if (this.deleteShouldFail) {
      return {
        error:
          this.deleteError instanceof StorageError
            ? this.deleteError
            : new StorageError(
                this.deleteError?.message || "Delete failed",
                this.deleteError,
              ),
      };
    }

    this.files = this.files.filter((f) => f.path !== path);
    this.contentMap.delete(path);
    return { result: { success: true } };
  }

  async readFile(
    path: string,
  ): Promise<ReturnsError<Readable, StorageError | FileNotFoundError>> {
    if (this.readShouldFail) {
      return {
        error:
          this.readError instanceof StorageError ||
          this.readError instanceof FileNotFoundError
            ? this.readError
            : new StorageError(
                this.readError?.message || "Read failed",
                this.readError,
              ),
      };
    }

    const file = this.files.find((f) => f.path === path);
    if (!file) {
      return {
        error: new FileNotFoundError(path),
      };
    }

    const content = this.contentMap.get(path) ?? Buffer.alloc(0);
    return { result: Readable.from(content) };
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
    return {
      result: {
        success: true,
        created: true,
        url: "https://mock-storage.blob.core.windows.net/test-container",
      },
    };
  }
}
