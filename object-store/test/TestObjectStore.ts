import { Readable } from "stream";
import { buffer as streamToBuffer } from "node:stream/consumers";
import { ObjectStore } from "../ObjectStore.ts";
import type { ReturnsError } from "@saflib/monorepo";
import { StorageError, FileNotFoundError } from "../ObjectStore.ts";

export interface TestFile {
  path: string;
  size?: number;
  metadata?: Record<string, string>;
}

/**
 * In-memory ObjectStore for tests. Use setFiles/getFiles to seed or inspect
 * state when testing code that uses an ObjectStore.
 */
export class TestObjectStore extends ObjectStore {
  private files: TestFile[] = [];
  private contentMap = new Map<string, Buffer>();

  setFiles(files: TestFile[]): void {
    this.files = files;
    this.contentMap.clear();
  }

  getFiles(): TestFile[] {
    return [...this.files];
  }

  async uploadFile(
    path: string,
    stream: Readable,
    metadata?: Record<string, string>,
  ): Promise<ReturnsError<{ success: boolean; url?: string }, StorageError>> {
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
    const filtered = prefix
      ? this.files.filter((f) => f.path.startsWith(prefix))
      : this.files;
    return { result: filtered };
  }

  async deleteFile(
    path: string,
  ): Promise<ReturnsError<{ success: boolean }, StorageError>> {
    this.files = this.files.filter((f) => f.path !== path);
    this.contentMap.delete(path);
    return { result: { success: true } };
  }

  async readFile(
    path: string,
  ): Promise<ReturnsError<Readable, StorageError | FileNotFoundError>> {
    const file = this.files.find((f) => f.path === path);
    if (!file) {
      return { error: new FileNotFoundError(path) };
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
