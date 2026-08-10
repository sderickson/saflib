import { DbManager } from "@saflib/drizzle";
import * as schema from "./schema.ts";
import config from "./drizzle.config.ts";

// Full \`schema.ts\` import is for connect/migrate paths only; query modules import \`instances\` without the barrel.
export const __serviceName__DbManager = new DbManager(
  schema,
  config,
  import.meta.url,
);

export const __serviceName__Db = __serviceName__DbManager.publicInterface();
