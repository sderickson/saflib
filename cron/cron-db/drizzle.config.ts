import type { Config } from "drizzle-kit";
import path from "path";
import { fileURLToPath } from "url";
import { typedEnv } from "@saflib/env";

const getDirname = () => {
  const __filename = fileURLToPath(import.meta.url);
  return path.dirname(__filename);
};

// Use NODE_ENV to differentiate db files (optional, but good practice)
const dbName = `cron-${typedEnv.DEPLOYMENT_NAME}.sqlite`;

export const getDbPath = () => {
  return path.join(getDirname(), `data/${dbName}`);
};

export const getMigrationsPath = () => {
  return path.join(getDirname(), "./migrations");
};

export default {
  out: "./migrations",
  schema: "./schema.ts",
  dialect: "sqlite",
  dbCredentials: { url: `./data/${dbName}` },
} satisfies Config;
