import { describe, it, expect } from "vitest";
import { ObjectStore, PathTraversalError } from "./ObjectStore.ts";
import { TestObjectStore } from "./TestObjectStore.ts";

describe("ObjectStore", () => {
  describe("constructor", () => {
    it("should initialize", () => {
      const store = new TestObjectStore();
      expect(store).toBeInstanceOf(ObjectStore);
    });
  });

  describe("normalizePath", () => {
    it("should normalize paths with multiple slashes", () => {
      const store = new TestObjectStore();
      expect(store.normalizePath("a//b///c")).toBe("a/b/c");
    });

    it("should remove empty segments", () => {
      const store = new TestObjectStore();
      expect(store.normalizePath("a//b")).toBe("a/b");
    });

    it("should remove dot segments", () => {
      const store = new TestObjectStore();
      expect(store.normalizePath("a/./b")).toBe("a/b");
    });

    it("should handle empty string", () => {
      const store = new TestObjectStore();
      expect(store.normalizePath("")).toBe("");
    });

    it("should handle single dot", () => {
      const store = new TestObjectStore();
      expect(store.normalizePath(".")).toBe("");
    });

    it("should handle leading and trailing slashes", () => {
      const store = new TestObjectStore();
      expect(store.normalizePath("/a/b/")).toBe("a/b");
    });
  });

  describe("validatePath", () => {
    it("should validate and normalize path", () => {
      const store = new TestObjectStore();
      expect(store.validatePath("file.txt")).toBe("file.txt");
    });

    it("should throw PathTraversalError for paths with ..", () => {
      const store = new TestObjectStore();
      expect(() => store.validatePath("../file.txt")).toThrow(
        PathTraversalError,
      );
    });

    it("should throw PathTraversalError for paths with .. segment", () => {
      const store = new TestObjectStore();
      expect(() => store.validatePath("../../file.txt")).toThrow(
        PathTraversalError,
      );
    });

    it("should allow subdirectory paths", () => {
      const store = new TestObjectStore();
      expect(store.validatePath("other/file.txt")).toBe("other/file.txt");
    });

    it("should allow nested paths", () => {
      const store = new TestObjectStore();
      expect(store.validatePath("folder/subfolder/file.txt")).toBe(
        "folder/subfolder/file.txt",
      );
    });

    it("should normalize paths during validation", () => {
      const store = new TestObjectStore();
      expect(store.validatePath("sub//file.txt")).toBe("sub/file.txt");
    });
  });

  describe("getScopedPath", () => {
    it("should return validated path", () => {
      const store = new TestObjectStore();
      expect(store.getScopedPath("file.txt")).toBe("file.txt");
    });

    it("should validate path before returning", () => {
      const store = new TestObjectStore();
      expect(() => store.getScopedPath("../file.txt")).toThrow(
        PathTraversalError,
      );
    });
  });

  describe("PathTraversalError", () => {
    it("should create error with correct message", () => {
      const error = new PathTraversalError("../file.txt");
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(PathTraversalError);
      expect(error.name).toBe("PathTraversalError");
      expect(error.message).toBe(
        'Path "../file.txt" attempts path traversal',
      );
    });
  });
});
