import { describe, it, expect, beforeEach } from "vitest";
import { useRestoreBackup } from "./restore.ts";
import { listBackups } from "./list.ts";
import { backupServiceFakeHandlers } from "../../fakes.ts";
import { backupStubs } from "./list.fake.ts";
import { withVueQuery } from "@saflib/sdk/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { useQuery } from "@tanstack/vue-query";

describe("useRestoreBackup", () => {
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
    );
  });

  it("should restore a backup", async () => {
    const [mutation, app] = withVueQuery(() => useRestoreBackup());

    const result = await mutation.mutateAsync("backup-1");

    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.message).toBe("Backup restored successfully");

    app.unmount();
  });

  it("should invalidate list query cache when backup is restored", async () => {
    const [listQuery, app1] = withVueQuery(() => useQuery(listBackups()));
    const [mutation, app2] = withVueQuery(() => useRestoreBackup());

    await listQuery.refetch();

    const error = listQuery.error.value;
    if (error) {
      app1.unmount();
      app2.unmount();
      throw error;
    }

    const initialLength = listQuery.data.value?.length ?? 0;
    expect(initialLength).toBe(1);

    await mutation.mutateAsync("backup-1");

    await listQuery.refetch();

    const errorAfterRestore = listQuery.error.value;
    if (errorAfterRestore) {
      app1.unmount();
      app2.unmount();
      throw errorAfterRestore;
    }

    const dataAfterRestore = listQuery.data.value;
    expect(dataAfterRestore).toBeDefined();
    expect(dataAfterRestore).toHaveLength(2);
    expect(
      dataAfterRestore?.some(
        (b) => b.metadata?.description === "Safety backup before restore",
      ),
    ).toBe(true);

    app1.unmount();
    app2.unmount();
  });
});
