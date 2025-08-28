import { sqliteTable, integer, text } from "drizzle-orm/sqlite-core";

export const testTable = sqliteTable("test_table", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name"),
});
