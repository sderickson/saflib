import { DbManager } from "@saflib/drizzle";
import * as schema from "./schema.ts";
import config from "./drizzle.config.ts";

/** Shared by both blue-green colors: WAL plus a busy timeout. */
export const opsDbManager = new DbManager(schema, config, import.meta.url, {
  defaultPragmas: { journal_mode: "WAL", busy_timeout: 5000 },
});
