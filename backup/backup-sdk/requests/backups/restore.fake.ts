import { backupHandler } from "../../typed-fake.ts";
import { backupStubs } from "./list.fake.ts";
import type { Backup } from "@saflib/backup-spec";

export const restoreBackupHandler = backupHandler({
  verb: "post",
  path: "/backups/{backupId}/restore",
  status: 200,
  handler: async () => {
    const timestamp = Date.now();
    const uuid = crypto.randomUUID();
    const filename = `backup-${timestamp}-manual-${uuid}.db`;

    const safetyBackup: Backup = {
      id: uuid,
      type: "manual",
      timestamp: new Date(timestamp).toISOString(),
      size: 1024,
      path: filename,
      metadata: {
        description: "Safety backup before restore",
      },
    };

    backupStubs.push(safetyBackup);

    return {
      success: true,
      message: "Backup restored successfully",
    };
  },
});
