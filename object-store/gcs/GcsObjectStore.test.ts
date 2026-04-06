import { describe, it, expect } from "vitest";
import { Readable } from "stream";
import { GcsObjectStore } from "./GcsObjectStore.ts";
import { PathTraversalError, StorageError } from "../ObjectStore.ts";

describe("GcsObjectStore", () => {
  describe("constructor", () => {
    it("should initialize with bucket name", () => {
      const store = new GcsObjectStore({
        bucketName: "test-bucket",
        accessLevel: "private",
      });
      expect(store).toBeInstanceOf(GcsObjectStore);
    });

    it("should initialize with location", () => {
      const store = new GcsObjectStore({
        bucketName: "test-bucket",
        accessLevel: "private",
        location: "europe-west1",
      });
      expect(store).toBeInstanceOf(GcsObjectStore);
    });

    it("should initialize with public access level", () => {
      const store = new GcsObjectStore({
        bucketName: "test-bucket",
        accessLevel: "blob",
      });
      expect(store).toBeInstanceOf(GcsObjectStore);
    });
  });

  describe("uploadFile", () => {
    it("should upload file successfully", async () => {
      const store = new GcsObjectStore({
        bucketName: "test-bucket",
        accessLevel: "private",
      });
      const stream = Readable.from("test content");

      const result = await store.uploadFile("test.txt", stream);

      expect("result" in result).toBe(true);
      if ("result" in result && result.result) {
        expect(result.result.success).toBe(true);
        expect(result.result.url).toBeDefined();
      }
    });

    it("should upload file with metadata", async () => {
      const store = new GcsObjectStore({
        bucketName: "test-bucket",
        accessLevel: "private",
      });
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

    it("should include path in url", async () => {
      const store = new GcsObjectStore({
        bucketName: "test-bucket",
        accessLevel: "private",
      });
      const stream = Readable.from("test content");

      const result = await store.uploadFile("file.txt", stream);

      expect("result" in result).toBe(true);
      if ("result" in result && result.result) {
        expect(result.result.success).toBe(true);
        expect(result.result.url).toContain("file.txt");
      }
    });

    it("should return StorageError for invalid paths", async () => {
      const store = new GcsObjectStore({
        bucketName: "test-bucket",
        accessLevel: "private",
      });
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
      const store = new GcsObjectStore({
        bucketName: "test-bucket",
        accessLevel: "private",
      });
      const result = await store.listFiles();

      expect("result" in result).toBe(true);
      if ("result" in result && result.result) {
        expect(result.result).toEqual([]);
      }
    });

    it("should accept prefix parameter", async () => {
      const store = new GcsObjectStore({
        bucketName: "test-bucket",
        accessLevel: "private",
      });
      const result = await store.listFiles("subfolder");

      expect("result" in result).toBe(true);
      if ("result" in result && result.result) {
        expect(Array.isArray(result.result)).toBe(true);
      }
    });
  });

  describe("deleteFile", () => {
    it("should delete file successfully", async () => {
      const store = new GcsObjectStore({
        bucketName: "test-bucket",
        accessLevel: "private",
      });
      const result = await store.deleteFile("test.txt");

      expect("result" in result).toBe(true);
      if ("result" in result && result.result) {
        expect(result.result.success).toBe(true);
      }
    });

    it("should return StorageError for invalid paths", async () => {
      const store = new GcsObjectStore({
        bucketName: "test-bucket",
        accessLevel: "private",
      });

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
      const store = new GcsObjectStore({
        bucketName: "test-bucket",
        accessLevel: "private",
      });
      const result = await store.readFile("test.txt");

      expect("result" in result).toBe(true);
      if ("result" in result && result.result) {
        expect(result.result).toBeInstanceOf(Readable);
      }
    });

    it("should return StorageError for invalid paths", async () => {
      const store = new GcsObjectStore({
        bucketName: "test-bucket",
        accessLevel: "private",
      });

      const result = await store.readFile("../file.txt");

      expect("error" in result).toBe(true);
      if ("error" in result && result.error) {
        expect(result.error).toBeInstanceOf(StorageError);
        expect(result.error.cause).toBeInstanceOf(PathTraversalError);
      }
    });
  });

  describe("path handling", () => {
    it("should use nested path in url", async () => {
      const store = new GcsObjectStore({
        bucketName: "test-bucket",
        accessLevel: "private",
      });
      const stream = Readable.from("test");

      const uploadResult = await store.uploadFile(
        "folder/subfolder/file.txt",
        stream,
      );
      expect("result" in uploadResult).toBe(true);
      if ("result" in uploadResult && uploadResult.result) {
        expect(uploadResult.result.url).toContain(
          "folder/subfolder/file.txt",
        );
      }
    });
  });

  describe("upsertContainer", () => {
    it("should upsert bucket successfully in test mode", async () => {
      const store = new GcsObjectStore({
        bucketName: "my-bucket",
        accessLevel: "private",
      });
      const result = await store.upsertContainer();

      expect("result" in result).toBe(true);
      if ("result" in result && result.result) {
        expect(result.result.success).toBe(true);
        expect(result.result.created).toBe(true);
        expect(result.result.url).toBe("https://storage.googleapis.com/my-bucket");
      }
    });

    it("should use access level from constructor (blob)", async () => {
      const store = new GcsObjectStore({
        bucketName: "blob-bucket",
        accessLevel: "blob",
      });
      const result = await store.upsertContainer();

      expect("result" in result).toBe(true);
      if ("result" in result && result.result) {
        expect(result.result.success).toBe(true);
      }
    });

    it("should use store bucket name in url", async () => {
      const store = new GcsObjectStore({
        bucketName: "custom-bucket-name",
        accessLevel: "private",
      });
      const result = await store.upsertContainer();

      expect("result" in result).toBe(true);
      if ("result" in result && result.result) {
        expect(result.result.url).toContain("custom-bucket-name");
      }
    });
  });
});
