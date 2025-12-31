import { describe, it, expect, beforeEach } from "vitest";
import { Readable } from "stream";
import {
  makeContext,
  backupServiceStorage,
} from "@saflib/backup-service-common";
import { TestObjectStore } from "@saflib/object-store";
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
});
