import { DbManager } from "@saflib/drizzle";
import * as schema from "./schema.ts";
import config from "./drizzle.config.ts";

// `schema.ts` is imported here for connect/migrate; query modules import `instances` directly.
export const __serviceName__DbManager = new DbManager(
  schema,
  config,
  import.meta.url,
);

export const __serviceName__Db = __serviceName__DbManager.publicInterface();
