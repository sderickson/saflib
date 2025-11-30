import { describe, it, expect, beforeEach } from "vitest";
import { Readable } from "stream";
import {
  makeContext,
  backupServiceStorage,
} from "@saflib/backup-service-common";
import {
  TestObjectStore,
  StorageError,
  PathTraversalError,
} from "@saflib/object-store";
import { automatic } from "./automatic.ts";

describe("automatic backup job", () => {
  let objectStore: TestObjectStore;
  let backupFn: () => Promise<Readable>;

  beforeEach(() => {
    objectStore = new TestObjectStore();
    backupFn = async () => new Readable();
  });

  it("should successfully create and upload backup", async () => {
    const context = makeContext({
      backupFn,
      objectStore,
    });

    await backupServiceStorage.run(context, async () => {
      await automatic();
    });

    const files = objectStore.getFiles();
    expect(files).toHaveLength(1);
    expect(files[0].path).toMatch(/^backup-\d+-automatic-.+\.db$/);
  });

  it("should handle missing backupFn configuration", async () => {
    const context = makeContext({
      objectStore,
    });

    await backupServiceStorage.run(context, async () => {
      await automatic();
    });

    const files = objectStore.getFiles();
    expect(files).toHaveLength(0);
  });

  it("should handle missing objectStore configuration", async () => {
    const context = makeContext({
      backupFn,
    });

    await backupServiceStorage.run(context, async () => {
      await automatic();
    });
  });

  it("should handle StorageError during upload", async () => {
    const storageError = new StorageError("Upload failed");
    objectStore.setUploadShouldFail(storageError);

    const context = makeContext({
      backupFn,
      objectStore,
    });

    await backupServiceStorage.run(context, async () => {
      await automatic();
    });

    const files = objectStore.getFiles();
    expect(files).toHaveLength(0);
  });

  it("should handle PathTraversalError during upload", async () => {
    const pathTraversalError = new PathTraversalError(
      "../invalid-path",
      "backups",
    );
    objectStore.setUploadShouldFail(pathTraversalError);

    const context = makeContext({
      backupFn,
      objectStore,
    });

    await backupServiceStorage.run(context, async () => {
      await automatic();
    });

    const files = objectStore.getFiles();
    expect(files).toHaveLength(0);
  });

  it("should handle generic error during upload", async () => {
    const genericError = new Error("Generic upload error");
    objectStore.setUploadShouldFail(genericError);

    const context = makeContext({
      backupFn,
      objectStore,
    });

    await backupServiceStorage.run(context, async () => {
      await automatic();
    });

    const files = objectStore.getFiles();
    expect(files).toHaveLength(0);
  });
});
