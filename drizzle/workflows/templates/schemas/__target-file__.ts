import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";

// TODO: Any enums should be defined like so
const someEnum = ["foo", "bar"] as const;
export type SomeEnum = (typeof someEnum)[number];

// TODO: Replace this example table with actual tables for your database
export interface TemplateFileEntity {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  someEnum: SomeEnum;
}

// TODO: Replace this table with actual tables for your database
export const templateFileTable = sqliteTable("template_file_table", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  someEnum: text("stub_enum", { enum: someEnum }).notNull(),
});

export type TemplateFileEntityTest = Expect<
  Equal<TemplateFileEntity, typeof templateFileTable.$inferSelect>
>;
