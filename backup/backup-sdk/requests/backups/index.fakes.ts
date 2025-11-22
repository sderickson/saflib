import { listBackupsHandler } from "./list.fake.ts";
import { createBackupHandler } from "./create.fake.ts";
import { deleteBackupHandler } from "./delete.fake.ts";
import { restoreBackupHandler } from "./restore.fake.ts";

export * from "./list.fake.ts";
export * from "./create.fake.ts";
export * from "./delete.fake.ts";
export * from "./restore.fake.ts";

export const backupsFakeHandlers = [
  listBackupsHandler,
  createBackupHandler,
  deleteBackupHandler,
  restoreBackupHandler,
];
