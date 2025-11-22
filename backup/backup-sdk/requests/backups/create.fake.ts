import { backupHandler } from "../../typed-fake.ts";
import { backupStubs } from "./list.fake.ts";
import type { Backup } from "@saflib/backup-spec";

type CreateBackupBody = {
  description?: string;
  tags?: string[];
};

export const createBackupHandler = backupHandler({
  verb: "post",
  path: "/backups",
  status: 201,
  handler: async ({ body }) => {
    const bodyData = (body || {}) as CreateBackupBody;
    const timestamp = Date.now();
    const uuid = crypto.randomUUID();
    const filename = `backup-${timestamp}-manual-${uuid}.db`;

    const metadata: Record<string, string> = {};
    if (bodyData.description) {
      metadata.description = bodyData.description;
    }
    if (bodyData.tags && bodyData.tags.length > 0) {
      metadata.tags = JSON.stringify(bodyData.tags);
    }

    const newBackup: Backup = {
      id: uuid,
      type: "manual",
      timestamp: new Date(timestamp).toISOString(),
      size: 1024,
      path: filename,
      metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
    };

    backupStubs.push(newBackup);

    return newBackup;
  },
});
