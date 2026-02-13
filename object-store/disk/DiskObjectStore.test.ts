import { afterAll, describe, it, expect } from "vitest";
import { Readable } from "stream";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { tmpdir } from "node:os";
import { DiskObjectStore } from "./DiskObjectStore.ts";
import {
  PathTraversalError,
  StorageError,
  FileNotFoundError,
} from "../ObjectStore.ts";

describe("DiskObjectStore", () => {
  const root = mkdtempSync(path.join(tmpdir(), "disk-object-store-"));

  afterAll(() => {
    rmSync(root, { recursive: true, force: true });
  });

  describe("constructor", () => {
    it("should initialize with root path", () => {
      const store = new DiskObjectStore(root);
      expect(store).toBeInstanceOf(DiskObjectStore);
    });
  });

  describe("upsertContainer", () => {
    it("should create root directory", async () => {
      const store = new DiskObjectStore(root);
      const result = await store.upsertContainer();
      expect("result" in result).toBe(true);
      if ("result" in result && result.result) {
        expect(result.result.success).toBe(true);
        expect(result.result.url).toContain("file://");
      }
    });
  });

  describe("uploadFile", () => {
    it("should upload file and return success", async () => {
      const store = new DiskObjectStore(root);
      const stream = Readable.from("hello");
      const result = await store.uploadFile("test.txt", stream);
      expect("result" in result).toBe(true);
      if ("result" in result && result.result) {
        expect(result.result.success).toBe(true);
        expect(result.result.url).toContain("test.txt");
      }
    });

    it("should upload file to nested path", async () => {
      const store = new DiskObjectStore(root);
      const stream = Readable.from("nested content");
      const result = await store.uploadFile("a/b/c.txt", stream);
      expect("result" in result).toBe(true);
      if ("result" in result && result.result) {
        expect(result.result.success).toBe(true);
      }
    });

    it("should return StorageError for path traversal", async () => {
      const store = new DiskObjectStore(root);
      const stream = Readable.from("bad");
      const result = await store.uploadFile("../etc/passwd", stream);
      expect("error" in result).toBe(true);
      if ("error" in result && result.error) {
        expect(result.error).toBeInstanceOf(StorageError);
        expect(result.error.cause).toBeInstanceOf(PathTraversalError);
      }
    });
  });

  describe("listFiles", () => {
    it("should list uploaded files", async () => {
      const store = new DiskObjectStore(root);
      const result = await store.listFiles();
      expect("result" in result).toBe(true);
      if ("result" in result && result.result) {
        const paths = result.result.map((f) => f.path).sort();
        expect(paths).toContain("test.txt");
        expect(paths).toContain("a/b/c.txt");
        expect(result.result.find((f) => f.path === "test.txt")?.size).toBe(5);
      }
    });

    it("should filter by prefix", async () => {
      const store = new DiskObjectStore(root);
      const result = await store.listFiles("a/");
      expect("result" in result).toBe(true);
      if ("result" in result && result.result) {
        expect(result.result.map((f) => f.path)).toEqual(["a/b/c.txt"]);
      }
    });
  });

  describe("readFile", () => {
    it("should return stream for existing file", async () => {
      const store = new DiskObjectStore(root);
      const result = await store.readFile("test.txt");
      expect("result" in result).toBe(true);
      if ("result" in result && result.result) {
        const chunks: Buffer[] = [];
        for await (const chunk of result.result) {
          chunks.push(Buffer.from(chunk));
        }
        expect(Buffer.concat(chunks).toString()).toBe("hello");
      }
    });

    it("should return FileNotFoundError for missing file", async () => {
      const store = new DiskObjectStore(root);
      const result = await store.readFile("missing.txt");
      expect("error" in result).toBe(true);
      if ("error" in result && result.error) {
        expect(result.error).toBeInstanceOf(FileNotFoundError);
      }
    });
  });

  describe("deleteFile", () => {
    it("should delete file", async () => {
      const store = new DiskObjectStore(root);
      const result = await store.deleteFile("test.txt");
      expect("result" in result).toBe(true);
      if ("result" in result && result.result) {
        expect(result.result.success).toBe(true);
      }
      const list = await store.listFiles();
      if ("result" in list && list.result) {
        expect(list.result.map((f) => f.path)).not.toContain("test.txt");
      }
    });
  });
});
