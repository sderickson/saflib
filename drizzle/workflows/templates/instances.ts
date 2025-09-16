import { DbManager } from "@saflib/drizzle";
import * as schema from "./schema.ts";
import config from "./drizzle.config.ts";

export const templateFileDbManager = new DbManager(
  schema,
  config,
  import.meta.url,
);
