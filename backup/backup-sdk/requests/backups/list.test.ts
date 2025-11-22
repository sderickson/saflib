import { describe, it, expect, beforeEach } from "vitest";
import { listBackups } from "./list.ts";
import { backupServiceFakeHandlers } from "../../fakes.ts";
import { backupStubs } from "./list.fake.ts";
import { withVueQuery } from "@saflib/sdk/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { useQuery } from "@tanstack/vue-query";
import type { Backup } from "@saflib/backup-spec";

describe("listBackups", () => {
  setupMockServer(backupServiceFakeHandlers);

  beforeEach(() => {
    backupStubs.length = 0;
    backupStubs.push(
      {
        id: "backup-1",
        type: "automatic",
        timestamp: "2024-01-01T00:00:00Z",
        size: 1048576,
        path: "backup-1704067200000-automatic-backup-1.db",
        metadata: {
          source: "database",
          version: "1.0",
        },
      },
      {
        id: "backup-2",
        type: "manual",
        timestamp: "2024-01-02T12:00:00Z",
        size: 2097152,
        path: "backup-1704196800000-manual-backup-2.db",
        metadata: {
          description: "Manual backup before major update",
          tags: '["pre-update","important"]',
        },
      },
      {
        id: "backup-3",
        type: "automatic",
        timestamp: "2024-01-03T00:00:00Z",
        size: 1572864,
        path: "backup-1704268800000-automatic-backup-3.db",
      },
    );
  });

  it("should return list of backups", async () => {
    const [query, app] = withVueQuery(() => useQuery(listBackups()));

    await query.refetch();
    
    if (query.error.value) {
      throw query.error.value;
    }
    
    expect(query.data.value).toBeDefined();
    expect(Array.isArray(query.data.value)).toBe(true);
    expect(query.data.value).toHaveLength(backupStubs.length);
    expect(query.data.value).toEqual(backupStubs);

    app.unmount();
  });

  it("should reflect changes to backupStubs when refetched", async () => {
    const [query, app] = withVueQuery(() => useQuery(listBackups()));

    await query.refetch();
    
    if (query.error.value) {
      throw query.error.value;
    }
    
    const initialLength = query.data.value?.length ?? 0;
    expect(initialLength).toBe(3);

    const newBackup: Backup = {
      id: "backup-4",
      type: "manual",
      timestamp: "2024-01-04T00:00:00Z",
      size: 3145728,
      path: "backup-1704355200000-manual-backup-4.db",
    };

    backupStubs.push(newBackup);

    await query.refetch();
    
    const error = query.error.value;
    if (error) {
      throw error;
    }
    
    const data = query.data.value;
    expect(data).toBeDefined();
    expect(data).toHaveLength(4);
    expect(data).toContainEqual(newBackup);

    app.unmount();
  });
});
