import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";
// BEGIN ONCE WORKFLOW AREA drizzleImport FOR drizzle/update-schema IF file
import { fileMetadataColumns, type FileMetadataFields } from "@saflib/drizzle";
// END WORKFLOW AREA

// TODO: Any enums should be defined like so
const someEnum = ["foo", "bar"] as const;
export type SomeEnum = (typeof someEnum)[number];

// TODO: Replace this example table with actual tables for your database
export interface __GroupName__Entity
  // BEGIN ONCE WORKFLOW AREA entityInterface FOR drizzle/update-schema IF file
  extends FileMetadataFields
  /* END WORKFLOW AREA */
  {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  someEnum: SomeEnum;
}

// TODO: Replace this table with actual tables for your database
export const __groupName__Table = sqliteTable("__group_name___table", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  someEnum: text("stub_enum", { enum: someEnum }).notNull(),
  // BEGIN ONCE WORKFLOW AREA tableColumns FOR drizzle/update-schema IF file
  ...fileMetadataColumns,
  // END WORKFLOW AREA
});

export type __GroupName__EntityTest = Expect<
  Equal<__GroupName__Entity, typeof __groupName__Table.$inferSelect>
>;
