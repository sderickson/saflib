import { Readable } from "stream";
import type { AccessTier } from "@azure/storage-blob";
import type { ReturnsError } from "@saflib/monorepo";

export class PathTraversalError extends Error {
  constructor(path: string, folderPath: string) {
    super(
      `Path "${path}" attempts to escape the scoped folder "${folderPath}"`,
    );
    this.name = "PathTraversalError";
  }
}

export abstract class ObjectStore {
  protected readonly containerName: string;
  protected readonly folderPath: string;
  protected readonly tier: AccessTier;

  constructor(
    containerName: string,
    folderPath: string = "",
    tier: AccessTier = "Hot",
  ) {
    this.containerName = containerName;
    this.folderPath = this.normalizePath(folderPath);
    this.tier = tier;
  }

  protected normalizePath(path: string): string {
    return path
      .split("/")
      .filter((segment) => segment !== "" && segment !== ".")
      .join("/");
  }

  protected validatePath(path: string): string {
    const normalizedPath = this.normalizePath(path);

    if (normalizedPath.includes("..")) {
      throw new PathTraversalError(path, this.folderPath);
    }

    const fullPath = this.folderPath
      ? `${this.folderPath}/${normalizedPath}`
      : normalizedPath;

    const resolvedPath = this.normalizePath(fullPath);

    if (this.folderPath) {
      if (!resolvedPath.startsWith(this.folderPath)) {
        throw new PathTraversalError(path, this.folderPath);
      }
    }

    return resolvedPath;
  }

  protected getScopedPath(path: string): string {
    return this.validatePath(path);
  }

  abstract uploadFile(
    path: string,
    stream: Readable,
    metadata?: Record<string, string>,
  ): Promise<ReturnsError<{ success: boolean; url?: string }>>;

  abstract listFiles(
    prefix?: string,
  ): Promise<
    ReturnsError<
      Array<{ path: string; size?: number; metadata?: Record<string, string> }>
    >
  >;

  abstract deleteFile(
    path: string,
  ): Promise<ReturnsError<{ success: boolean }>>;

  abstract readFile(path: string): Promise<ReturnsError<Readable>>;
}
