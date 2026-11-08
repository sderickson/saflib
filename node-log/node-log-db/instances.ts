import { DbManager } from "@saflib/drizzle";
import * as schema from "./schema.ts";
import config from "./drizzle.config.ts";

/**
 * Both blue-green colors write to the same file during a cutover: WAL lets
 * readers and a writer coexist, and busy_timeout waits out the other writer
 * instead of failing the batch. Logs can tolerate losing the last moments
 * on power loss, hence synchronous NORMAL.
 */
export const logsDbManager = new DbManager(schema, config, import.meta.url, {
  defaultPragmas: { journal_mode: "WAL", synchronous: "NORMAL", busy_timeout: 2000 },
});
