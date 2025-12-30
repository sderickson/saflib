import { describe, it, expect, beforeEach } from "vitest";
import {
  makeContext,
  backupServiceStorage,
} from "@saflib/backup-service-common";
import { TestObjectStore } from "@saflib/object-store";
import { cleanup } from "./cleanup.ts";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

describe("cleanup backup job", () => {
  let objectStore: TestObjectStore;

  beforeEach(() => {
    objectStore = new TestObjectStore();
  });

  it("should delete old automatic backups", async () => {
    const now = Date.now();
    const oldTimestamp = now - THIRTY_DAYS_MS - 1000;
    const newTimestamp = now - 10 * 24 * 60 * 60 * 1000;

    objectStore.setFiles([
      {
        path: `backup-${oldTimestamp}-automatic-old-backup-1.db`,
        size: 1024,
      },
      {
        path: `backup-${oldTimestamp}-automatic-old-backup-2.db`,
        size: 2048,
      },
      {
        path: `backup-${newTimestamp}-automatic-new-backup.db`,
        size: 1024,
      },
    ]);

    const context = makeContext({
      objectStore,
    });

    await backupServiceStorage.run(context, async () => {
      await cleanup();
    });

    const files = objectStore.getFiles();
    expect(files).toHaveLength(1);
    expect(files[0].path).toBe(
      `backup-${newTimestamp}-automatic-new-backup.db`
    );
  });

  it("should skip empty or incomplete backups", async () => {
    const now = Date.now();
    const oldTimestamp = now - THIRTY_DAYS_MS - 1000;

    objectStore.setFiles([
      {
        path: `backup-${oldTimestamp}-automatic-empty-backup.db`,
        size: 0,
      },
      {
        path: `backup-${oldTimestamp}-automatic-no-size-backup.db`,
      },
      {
        path: `backup-${oldTimestamp}-automatic-valid-backup.db`,
        size: 1024,
      },
    ]);

    const context = makeContext({
      objectStore,
    });

    await backupServiceStorage.run(context, async () => {
      await cleanup();
    });

    const files = objectStore.getFiles();
    expect(files).toHaveLength(2);
    const paths = files.map((f) => f.path);
    expect(paths).toContain(`backup-${oldTimestamp}-automatic-empty-backup.db`);
    expect(paths).toContain(
      `backup-${oldTimestamp}-automatic-no-size-backup.db`
    );
    expect(paths).not.toContain(
      `backup-${oldTimestamp}-automatic-valid-backup.db`
    );
  });

  it("should skip files that do not match automatic backup pattern", async () => {
    const now = Date.now();
    const oldTimestamp = now - THIRTY_DAYS_MS - 1000;

    objectStore.setFiles([
      {
        path: `backup-${oldTimestamp}-manual-manual-backup.db`,
        size: 1024,
      },
      {
        path: `backup-${oldTimestamp}-automatic-valid-backup.db`,
        size: 1024,
      },
      {
        path: `some-other-file.db`,
        size: 1024,
      },
      {
        path: `backup-${oldTimestamp}-invalid-type-backup.db`,
        size: 1024,
      },
    ]);

    const context = makeContext({
      objectStore,
    });

    await backupServiceStorage.run(context, async () => {
      await cleanup();
    });

    const files = objectStore.getFiles();
    expect(files).toHaveLength(3);
    const paths = files.map((f) => f.path);
    expect(paths).toContain(`backup-${oldTimestamp}-manual-manual-backup.db`);
    expect(paths).toContain(`some-other-file.db`);
    expect(paths).toContain(`backup-${oldTimestamp}-invalid-type-backup.db`);
    expect(paths).not.toContain(
      `backup-${oldTimestamp}-automatic-valid-backup.db`
    );
  });

  it("should skip backups that are not old enough", async () => {
    const now = Date.now();
    const recentTimestamp = now - 10 * 24 * 60 * 60 * 1000;
    const exactly30DaysTimestamp = now - THIRTY_DAYS_MS + 1000;

    objectStore.setFiles([
      {
        path: `backup-${recentTimestamp}-automatic-recent-backup.db`,
        size: 1024,
      },
      {
        path: `backup-${exactly30DaysTimestamp}-automatic-exactly-30-days.db`,
        size: 1024,
      },
    ]);

    const context = makeContext({
      objectStore,
    });

    await backupServiceStorage.run(context, async () => {
      await cleanup();
    });

    const files = objectStore.getFiles();
    expect(files).toHaveLength(2);
  });

  it("should handle mixed scenario with old, new, empty, and non-matching files", async () => {
    const now = Date.now();
    const oldTimestamp = now - THIRTY_DAYS_MS - 1000;
    const newTimestamp = now - 10 * 24 * 60 * 60 * 1000;

    objectStore.setFiles([
      {
        path: `backup-${oldTimestamp}-automatic-old-valid.db`,
        size: 1024,
      },
      {
        path: `backup-${oldTimestamp}-automatic-old-empty.db`,
        size: 0,
      },
      {
        path: `backup-${newTimestamp}-automatic-new-valid.db`,
        size: 2048,
      },
      {
        path: `backup-${oldTimestamp}-manual-manual-backup.db`,
        size: 1024,
      },
      {
        path: `backup-${oldTimestamp}-automatic-old-valid-2.db`,
        size: 3072,
      },
    ]);

    const context = makeContext({
      objectStore,
    });

    await backupServiceStorage.run(context, async () => {
      await cleanup();
    });

    const files = objectStore.getFiles();
    expect(files).toHaveLength(3);
    const paths = files.map((f) => f.path);
    expect(paths).toContain(`backup-${oldTimestamp}-automatic-old-empty.db`);
    expect(paths).toContain(`backup-${newTimestamp}-automatic-new-valid.db`);
    expect(paths).toContain(`backup-${oldTimestamp}-manual-manual-backup.db`);
    expect(paths).not.toContain(
      `backup-${oldTimestamp}-automatic-old-valid.db`
    );
    expect(paths).not.toContain(
      `backup-${oldTimestamp}-automatic-old-valid-2.db`
    );
  });

  it("should handle empty file list", async () => {
    objectStore.setFiles([]);

    const context = makeContext({
      objectStore,
    });

    await backupServiceStorage.run(context, async () => {
      await cleanup();
    });

    const files = objectStore.getFiles();
    expect(files).toHaveLength(0);
  });
});
