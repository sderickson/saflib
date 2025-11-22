import { describe, it, expect, beforeEach } from "vitest";
import { useDeleteBackup } from "./delete.ts";
import { listBackups } from "./list.ts";
import { backupServiceFakeHandlers } from "../../fakes.ts";
import { backupStubs } from "./list.fake.ts";
import { withVueQuery } from "@saflib/sdk/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { useQuery } from "@tanstack/vue-query";

describe("useDeleteBackup", () => {
  setupMockServer(backupServiceFakeHandlers);

  beforeEach(() => {
    backupStubs.length = 0;
    backupStubs.push(
      {
        id: "backup-1",
        type: "manual",
        timestamp: "2024-01-01T00:00:00Z",
        size: 1048576,
        path: "backup-1704067200000-manual-backup-1.db",
      },
      {
        id: "backup-2",
        type: "manual",
        timestamp: "2024-01-02T12:00:00Z",
        size: 2097152,
        path: "backup-1704196800000-manual-backup-2.db",
      },
      {
        id: "backup-3",
        type: "manual",
        timestamp: "2024-01-03T00:00:00Z",
        size: 1572864,
        path: "backup-1704268800000-manual-backup-3.db",
      },
    );
  });

  it("should delete a backup", async () => {
    const initialLength = backupStubs.length;
    const [mutation, app] = withVueQuery(() => useDeleteBackup());

    const result = await mutation.mutateAsync("backup-1");

    expect(backupStubs.length).toBe(initialLength - 1);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.message).toBe("Backup deleted successfully");
    expect(backupStubs.find((b) => b.id === "backup-1")).toBeUndefined();

    app.unmount();
  });

  it("should invalidate list query cache when backup is deleted", async () => {
    const [listQuery, app1] = withVueQuery(() => useQuery(listBackups()));
    const [mutation, app2] = withVueQuery(() => useDeleteBackup());

    await listQuery.refetch();

    const error = listQuery.error.value;
    if (error) {
      app1.unmount();
      app2.unmount();
      throw error;
    }

    const initialLength = listQuery.data.value?.length ?? 0;
    expect(initialLength).toBe(3);
    expect(listQuery.data.value?.some((b) => b.id === "backup-2")).toBe(true);

    await mutation.mutateAsync("backup-2");

    await listQuery.refetch();

    const errorAfterDelete = listQuery.error.value;
    if (errorAfterDelete) {
      app1.unmount();
      app2.unmount();
      throw errorAfterDelete;
    }

    const dataAfterDelete = listQuery.data.value;
    expect(dataAfterDelete).toBeDefined();
    expect(dataAfterDelete).toHaveLength(2);
    expect(dataAfterDelete?.some((b) => b.id === "backup-2")).toBe(false);

    app1.unmount();
    app2.unmount();
  });
});
