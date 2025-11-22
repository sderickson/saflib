import { listBackupsHandler } from "./list.fake.ts";
import { createBackupHandler } from "./create.fake.ts";

export * from "./list.fake.ts";
export * from "./create.fake.ts";

export const backupsFakeHandlers = [listBackupsHandler, createBackupHandler];
