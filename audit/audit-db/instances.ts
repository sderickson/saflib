import { DbManager } from "@saflib/drizzle";
import type { DbKey, DbOptions } from "@saflib/drizzle";
import * as schema from "./schema.ts";
import config from "./drizzle.config.ts";

const auditPragmas = {
  journal_mode: "WAL",
  synchronous: "FULL",
  foreign_keys: "ON",
  temp_store: "MEMORY",
  busy_timeout: 5000,
} as const satisfies Record<string, string | number>;

export const auditDbManager = new DbManager(schema, config, import.meta.url);

const baseInterface = auditDbManager.publicInterface();

/** Connect with audit pragmas merged in; callers must not omit WAL + synchronous FULL. */
export const auditDb = {
  ...baseInterface,
  connect: (options: DbOptions = {}) =>
    baseInterface.connect({
      ...options,
      pragmas: { ...auditPragmas, ...options.pragmas },
    }),
  attachAtPath: (key: DbKey, absolutePath: string) =>
    auditDbManager.attachConnection(key, absolutePath, {
      pragmas: { ...auditPragmas },
    }),
  backupTo: auditDbManager.backupTo.bind(auditDbManager),
};
