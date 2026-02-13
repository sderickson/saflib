import { Readable } from "stream";
import type { ReturnsError } from "@saflib/monorepo";

export class PathTraversalError extends Error {
  constructor(path: string) {
    super(`Path "${path}" attempts path traversal`);
    this.name = "PathTraversalError";
  }
}

export class StorageError extends Error {
  public readonly cause?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = "StorageError";
    this.cause = cause;
  }
}

export class FileNotFoundError extends Error {
  constructor(path: string) {
    super(`File not found: ${path}`);
    this.name = "FileNotFoundError";
  }
}

export abstract class ObjectStore {
  protected normalizePath(path: string): string {
    return path
      .split("/")
      .filter((segment) => segment !== "" && segment !== ".")
      .join("/");
  }

  protected validatePath(path: string): string {
    const normalizedPath = this.normalizePath(path);

    if (normalizedPath.includes("..")) {
      throw new PathTraversalError(path);
    }

    return normalizedPath;
  }

  protected getScopedPath(path: string): string {
    return this.validatePath(path);
  }

  abstract uploadFile(
    path: string,
    stream: Readable,
    metadata?: Record<string, string>,
  ): Promise<
    ReturnsError<
      { success: boolean; url?: string },
      PathTraversalError | StorageError
    >
  >;

  abstract listFiles(
    prefix?: string,
  ): Promise<
    ReturnsError<
      Array<{ path: string; size?: number; metadata?: Record<string, string> }>,
      PathTraversalError | StorageError
    >
  >;

  abstract deleteFile(
    path: string,
  ): Promise<
    ReturnsError<{ success: boolean }, PathTraversalError | StorageError>
  >;

  abstract readFile(
    path: string,
  ): Promise<
    ReturnsError<Readable, PathTraversalError | StorageError | FileNotFoundError>
  >;

  abstract upsertContainer(): Promise<
    ReturnsError<
      { success: boolean; created?: boolean; updated?: boolean; skipped?: boolean; url?: string },
      StorageError
    >
  >;
}
