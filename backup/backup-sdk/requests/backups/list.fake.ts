import { backupHandler } from "../../typed-fake.ts";
import type { Backup } from "@saflib/backup-spec";

export const backupStubs: Backup[] = [
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
];

export const listBackupsHandler = backupHandler({
  verb: "get",
  path: "/backups",
  status: 200,
  handler: async () => {
    return [...backupStubs];
  },
});
