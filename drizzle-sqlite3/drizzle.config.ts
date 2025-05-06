import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./test-migrations",
  schema: "./test-schema.ts",
  dialect: "sqlite",
});
