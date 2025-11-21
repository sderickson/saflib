import { describe, it, expect } from "vitest";
import { Readable } from "stream";
import { ObjectStore, PathTraversalError } from "./ObjectStore.ts";
import type { ReturnsError } from "@saflib/monorepo";

class TestObjectStore extends ObjectStore {
  public normalizePath(path: string): string {
    return super.normalizePath(path);
  }

  public validatePath(path: string): string {
    return super.validatePath(path);
  }

  public getScopedPath(path: string): string {
    return super.getScopedPath(path);
  }

  async uploadFile(
    _path: string,
    _stream: Readable,
    _metadata?: Record<string, string>,
  ): Promise<ReturnsError<{ success: boolean; url?: string }>> {
    return { result: { success: true } };
  }

  async listFiles(
    _prefix?: string,
  ): Promise<
    ReturnsError<
      Array<{ path: string; size?: number; metadata?: Record<string, string> }>
    >
  > {
    return { result: [] };
  }

  async deleteFile(
    _path: string,
  ): Promise<ReturnsError<{ success: boolean }>> {
    return { result: { success: true } };
  }

  async readFile(_path: string): Promise<ReturnsError<Readable>> {
    return { result: new Readable() };
  }
}

describe("ObjectStore", () => {
  describe("constructor", () => {
    it("should initialize with container name", () => {
      const store = new TestObjectStore("test-container");
      expect(store).toBeInstanceOf(ObjectStore);
    });

    it("should initialize with container name and folder path", () => {
      const store = new TestObjectStore("test-container", "folder/subfolder");
      expect(store).toBeInstanceOf(ObjectStore);
    });

    it("should initialize with container name, folder path, and tier", () => {
      const store = new TestObjectStore("test-container", "folder", "Cool");
      expect(store).toBeInstanceOf(ObjectStore);
    });
  });

  describe("normalizePath", () => {
    it("should normalize paths with multiple slashes", () => {
      const store = new TestObjectStore("test-container");
      expect(store.normalizePath("a//b///c")).toBe("a/b/c");
    });

    it("should remove empty segments", () => {
      const store = new TestObjectStore("test-container");
      expect(store.normalizePath("a//b")).toBe("a/b");
    });

    it("should remove dot segments", () => {
      const store = new TestObjectStore("test-container");
      expect(store.normalizePath("a/./b")).toBe("a/b");
    });

    it("should handle empty string", () => {
      const store = new TestObjectStore("test-container");
      expect(store.normalizePath("")).toBe("");
    });

    it("should handle single dot", () => {
      const store = new TestObjectStore("test-container");
      expect(store.normalizePath(".")).toBe("");
    });

    it("should handle leading and trailing slashes", () => {
      const store = new TestObjectStore("test-container");
      expect(store.normalizePath("/a/b/")).toBe("a/b");
    });
  });

  describe("validatePath", () => {
    it("should validate paths within folder scope", () => {
      const store = new TestObjectStore("test-container", "folder");
      expect(store.validatePath("file.txt")).toBe("folder/file.txt");
    });

    it("should validate paths without folder scope", () => {
      const store = new TestObjectStore("test-container");
      expect(store.validatePath("file.txt")).toBe("file.txt");
    });

    it("should throw PathTraversalError for paths with ..", () => {
      const store = new TestObjectStore("test-container", "folder");
      expect(() => store.validatePath("../file.txt")).toThrow(
        PathTraversalError,
      );
    });

    it("should throw PathTraversalError for paths escaping folder scope", () => {
      const store = new TestObjectStore("test-container", "folder");
      expect(() => store.validatePath("../../file.txt")).toThrow(
        PathTraversalError,
      );
    });

    it("should allow creating subdirectories within folder scope", () => {
      const store = new TestObjectStore("test-container", "folder/subfolder");
      expect(store.validatePath("other/file.txt")).toBe(
        "folder/subfolder/other/file.txt",
      );
    });

    it("should allow paths within nested folder scope", () => {
      const store = new TestObjectStore("test-container", "folder/subfolder");
      expect(store.validatePath("file.txt")).toBe("folder/subfolder/file.txt");
    });

    it("should normalize paths during validation", () => {
      const store = new TestObjectStore("test-container", "folder");
      expect(store.validatePath("sub//file.txt")).toBe("folder/sub/file.txt");
    });
  });

  describe("getScopedPath", () => {
    it("should return scoped path", () => {
      const store = new TestObjectStore("test-container", "folder");
      expect(store.getScopedPath("file.txt")).toBe("folder/file.txt");
    });

    it("should validate path before returning", () => {
      const store = new TestObjectStore("test-container", "folder");
      expect(() => store.getScopedPath("../file.txt")).toThrow(
        PathTraversalError,
      );
    });
  });

  describe("PathTraversalError", () => {
    it("should create error with correct message", () => {
      const error = new PathTraversalError("../file.txt", "folder");
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PathTraversalError);
      expect(error.name).toBe("PathTraversalError");
      expect(error.message).toBe(
        'Path "../file.txt" attempts to escape the scoped folder "folder"',
      );
    });
  });
});
