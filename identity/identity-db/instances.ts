import { DbManager } from "@saflib/drizzle-sqlite3";
import * as schema from "./schemas/index.ts";
import config from "./drizzle.config.ts";

export const identityDbManager = new DbManager(schema, config, import.meta.url);
