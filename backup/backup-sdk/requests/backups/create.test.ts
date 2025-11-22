import { describe, it, expect, beforeEach } from "vitest";
import { useCreateBackup } from "./create.ts";
import { listBackups } from "./list.ts";
import { backupServiceFakeHandlers } from "../../fakes.ts";
import { backupStubs } from "./list.fake.ts";
import { withVueQuery } from "@saflib/sdk/testing";
import { setupMockServer } from "@saflib/sdk/testing/mock";
import { useQuery } from "@tanstack/vue-query";

describe("useCreateBackup", () => {
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
      },
      {
        id: "backup-2",
        type: "manual",
        timestamp: "2024-01-02T12:00:00Z",
        size: 2097152,
        path: "backup-1704196800000-manual-backup-2.db",
      },
    );
  });

  it("should create a backup", async () => {
    const initialLength = backupStubs.length;
    const [mutation, app] = withVueQuery(() => useCreateBackup());

    const result = await mutation.mutateAsync({
      description: "Test backup",
      tags: ["test", "manual"],
    });

    expect(backupStubs.length).toBe(initialLength + 1);
    expect(result).toBeDefined();
    expect(result.type).toBe("manual");
    expect(result.metadata?.description).toBe("Test backup");
    expect(result.metadata?.tags).toBe('["test","manual"]');

    const createdBackup = backupStubs[backupStubs.length - 1];
    expect(createdBackup.id).toBe(result.id);
    expect(createdBackup.type).toBe("manual");

    app.unmount();
  });

  it("should invalidate list query cache when backup is created", async () => {
    const [listQuery, app1] = withVueQuery(() => useQuery(listBackups()));
    const [mutation, app2] = withVueQuery(() => useCreateBackup());

    await listQuery.refetch();

    const error = listQuery.error.value;
    if (error) {
      app1.unmount();
      app2.unmount();
      throw error;
    }

    const initialLength = listQuery.data.value?.length ?? 0;
    expect(initialLength).toBe(2);

    await mutation.mutateAsync({
      description: "New backup",
      tags: ["new"],
    });

    await listQuery.refetch();

    const errorAfterCreate = listQuery.error.value;
    if (errorAfterCreate) {
      app1.unmount();
      app2.unmount();
      throw errorAfterCreate;
    }

    const dataAfterCreate = listQuery.data.value;
    expect(dataAfterCreate).toBeDefined();
    expect(dataAfterCreate).toHaveLength(3);
    expect(dataAfterCreate?.some((b) => b.metadata?.description === "New backup")).toBe(true);

    app1.unmount();
    app2.unmount();
  });
});
