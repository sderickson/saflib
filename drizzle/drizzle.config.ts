import type { Config } from "drizzle-kit";

export default {
  out: "./test-migrations",
  schema: "./test-schema.ts",
  dialect: "sqlite",
} satisfies Config;
