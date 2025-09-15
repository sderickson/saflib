import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";

// TODO: Replace this example table with actual tables for your database
export interface TemplateFileEntity {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export const templateFileTable = sqliteTable("template_file_table", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export type TemplateFileEntityTest = Expect<
  Equal<TemplateFileEntity, typeof templateFileTable.$inferSelect>
>;
