import { defineConfig } from "drizzle-kit";
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

export default defineConfig({
  out: "./migrations", // Keep relative for drizzle-kit
  schema: "./schema.ts", // Keep relative for drizzle-kit
  dialect: "sqlite", // Use dialect instead of driver
  dbCredentials: { url: `./data/${dbName}` },
});
