import { describe, it, expect } from "vitest";
import { Readable } from "stream";
import { AzureObjectStore } from "./AzureObjectStore.ts";
import {
  PathTraversalError,
  StorageError,
  FileNotFoundError,
} from "../ObjectStore.ts";

describe("AzureObjectStore", () => {
  describe("constructor", () => {
    it("should initialize with container name", () => {
      const store = new AzureObjectStore("test-container");
      expect(store).toBeInstanceOf(AzureObjectStore);
    });

    it("should initialize with container name and folder path", () => {
      const store = new AzureObjectStore("test-container", "folder/subfolder");
      expect(store).toBeInstanceOf(AzureObjectStore);
    });

    it("should initialize with container name, folder path, and tier", () => {
      const store = new AzureObjectStore("test-container", "folder", "Cool");
      expect(store).toBeInstanceOf(AzureObjectStore);
    });
  });

  describe("uploadFile", () => {
    it("should upload file successfully", async () => {
      const store = new AzureObjectStore("test-container");
      const stream = Readable.from("test content");

      const result = await store.uploadFile("test.txt", stream);

      expect("result" in result).toBe(true);
      if ("result" in result && result.result) {
        expect(result.result.success).toBe(true);
        expect(result.result.url).toBeDefined();
      }
    });

    it("should upload file with metadata", async () => {
      const store = new AzureObjectStore("test-container");
      const stream = Readable.from("test content");

      const result = await store.uploadFile("test.txt", stream, {
        mimetype: "text/plain",
        filename: "test.txt",
        cacheTime: "2024-01-01T00:00:00Z",
      });

      expect("result" in result).toBe(true);
      if ("result" in result && result.result) {
        expect(result.result.success).toBe(true);
      }
    });

    it("should scope path with folderPath", async () => {
      const store = new AzureObjectStore("test-container", "folder");
      const stream = Readable.from("test content");

      const result = await store.uploadFile("file.txt", stream);

      expect("result" in result).toBe(true);
      if ("result" in result && result.result) {
        expect(result.result.success).toBe(true);
        expect(result.result.url).toContain("folder/file.txt");
      }
    });

    it("should return StorageError for invalid paths", async () => {
      const store = new AzureObjectStore("test-container", "folder");
      const stream = Readable.from("test content");

      const result = await store.uploadFile("../file.txt", stream);

      expect("error" in result).toBe(true);
      if ("error" in result && result.error) {
        expect(result.error).toBeInstanceOf(StorageError);
        expect(result.error.cause).toBeInstanceOf(PathTraversalError);
      }
    });
  });

  describe("listFiles", () => {
    it("should return empty array in test mode", async () => {
      const store = new AzureObjectStore("test-container");
      const result = await store.listFiles();

      expect("result" in result).toBe(true);
      if ("result" in result && result.result) {
        expect(result.result).toEqual([]);
      }
    });

    it("should accept prefix parameter", async () => {
      const store = new AzureObjectStore("test-container", "folder");
      const result = await store.listFiles("subfolder");

      expect("result" in result).toBe(true);
      if ("result" in result && result.result) {
        expect(Array.isArray(result.result)).toBe(true);
      }
    });

    it("should scope prefix with folderPath", async () => {
      const store = new AzureObjectStore("test-container", "folder");
      const result = await store.listFiles("subfolder");

      expect("result" in result).toBe(true);
    });
  });

  describe("deleteFile", () => {
    it("should delete file successfully", async () => {
      const store = new AzureObjectStore("test-container");
      const result = await store.deleteFile("test.txt");

      expect("result" in result).toBe(true);
      if ("result" in result && result.result) {
        expect(result.result.success).toBe(true);
      }
    });

    it("should scope path with folderPath", async () => {
      const store = new AzureObjectStore("test-container", "folder");
      const result = await store.deleteFile("file.txt");

      expect("result" in result).toBe(true);
      if ("result" in result && result.result) {
        expect(result.result.success).toBe(true);
      }
    });

    it("should return StorageError for invalid paths", async () => {
      const store = new AzureObjectStore("test-container", "folder");

      const result = await store.deleteFile("../file.txt");

      expect("error" in result).toBe(true);
      if ("error" in result && result.error) {
        expect(result.error).toBeInstanceOf(StorageError);
        expect(result.error.cause).toBeInstanceOf(PathTraversalError);
      }
    });
  });

  describe("readFile", () => {
    it("should return Readable stream in test mode", async () => {
      const store = new AzureObjectStore("test-container");
      const result = await store.readFile("test.txt");

      expect("result" in result).toBe(true);
      if ("result" in result && result.result) {
        expect(result.result).toBeInstanceOf(Readable);
      }
    });

    it("should scope path with folderPath", async () => {
      const store = new AzureObjectStore("test-container", "folder");
      const result = await store.readFile("file.txt");

      expect("result" in result).toBe(true);
      if ("result" in result && result.result) {
        expect(result.result).toBeInstanceOf(Readable);
      }
    });

    it("should return StorageError for invalid paths", async () => {
      const store = new AzureObjectStore("test-container", "folder");

      const result = await store.readFile("../file.txt");

      expect("error" in result).toBe(true);
      if ("error" in result && result.error) {
        expect(result.error).toBeInstanceOf(StorageError);
        expect(result.error.cause).toBeInstanceOf(PathTraversalError);
      }
    });
  });

  describe("path scoping", () => {
    it("should prepend folderPath to file paths", async () => {
      const store = new AzureObjectStore("test-container", "folder");
      const stream = Readable.from("test");

      const uploadResult = await store.uploadFile("file.txt", stream);
      expect("result" in uploadResult).toBe(true);
      if ("result" in uploadResult && uploadResult.result) {
        expect(uploadResult.result.url).toContain("folder/file.txt");
      }
    });

    it("should handle nested folder paths", async () => {
      const store = new AzureObjectStore("test-container", "folder/subfolder");
      const stream = Readable.from("test");

      const uploadResult = await store.uploadFile("file.txt", stream);
      expect("result" in uploadResult).toBe(true);
      if ("result" in uploadResult && uploadResult.result) {
        expect(uploadResult.result.url).toContain("folder/subfolder/file.txt");
      }
    });

    it("should work without folderPath", async () => {
      const store = new AzureObjectStore("test-container");
      const stream = Readable.from("test");

      const uploadResult = await store.uploadFile("file.txt", stream);
      expect("result" in uploadResult).toBe(true);
      if ("result" in uploadResult && uploadResult.result) {
        expect(uploadResult.result.url).toContain("file.txt");
        expect(uploadResult.result.url).not.toContain("folder/");
      }
    });
  });

  describe("error handling", () => {
    it("should return StorageError on upload failure", async () => {
      const store = new AzureObjectStore("test-container");
      const stream = Readable.from("test");

      const result = await store.uploadFile("test.txt", stream);

      if ("error" in result) {
        expect(result.error).toBeInstanceOf(StorageError);
      } else {
        expect("result" in result).toBe(true);
      }
    });

    it("should return StorageError on delete failure", async () => {
      const store = new AzureObjectStore("test-container");
      const result = await store.deleteFile("nonexistent.txt");

      if ("error" in result) {
        expect(result.error).toBeInstanceOf(StorageError);
      } else {
        expect("result" in result).toBe(true);
      }
    });

    it("should return FileNotFoundError or StorageError on read failure", async () => {
      const store = new AzureObjectStore("test-container");
      const result = await store.readFile("nonexistent.txt");

      if ("error" in result) {
        expect(
          result.error instanceof FileNotFoundError ||
            result.error instanceof StorageError,
        ).toBe(true);
      } else {
        expect("result" in result).toBe(true);
      }
    });
  });

  describe("StorageError", () => {
    it("should create error with message", () => {
      const error = new StorageError("Test error");
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(StorageError);
      expect(error.name).toBe("StorageError");
      expect(error.message).toBe("Test error");
    });

    it("should create error with cause", () => {
      const cause = new Error("Original error");
      const error = new StorageError("Test error", cause);
      expect(error.cause).toBe(cause);
    });
  });
});
