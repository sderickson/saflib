import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";
import { generateShortId } from "@saflib/drizzle";

/**
 * Minimal seed table so the offshoot package typechecks and parent schema
 * can re-export something real. Replace via drizzle/update-schema.
 */
export interface __OffshootName__Entity {
  id: string;
  name: string;
  created_at: Date;
  updated_at: Date;
}

export const __offshootName__Table = sqliteTable("__offshoot_name___table", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => generateShortId()),
  name: text("name").notNull(),
  created_at: integer("created_at", { mode: "timestamp" }).notNull(),
  updated_at: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export type __OffshootName__EntityTest = Expect<
  Equal<__OffshootName__Entity, typeof __offshootName__Table.$inferSelect>
>;
