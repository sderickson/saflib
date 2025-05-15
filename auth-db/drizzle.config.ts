import { defineConfig } from "drizzle-kit";
import path from "path";
import { fileURLToPath } from "url";

const getDirname = () => {
  const __filename = fileURLToPath(import.meta.url);
  return path.dirname(__filename);
};

const usersDbName = `users-${process.env.NODE_ENV}.sqlite`;

export const getDbPath = () => {
  return path.join(getDirname(), `data/${usersDbName}`);
};

export const getMigrationsPath = () => {
  return path.join(getDirname(), "./migrations");
};

export default defineConfig({
  out: "./migrations",
  schema: "./schema.ts",
  dialect: "sqlite",
  dbCredentials: {
    url: `./data/${usersDbName}`,
  },
});
