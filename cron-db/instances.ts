import { DbManager } from "@saflib/drizzle-sqlite3";
import * as schema from "./schema.ts";
import config from "./drizzle.config.ts";

export const cronDbManager = new DbManager(schema, config, import.meta.url);
