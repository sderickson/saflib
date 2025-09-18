import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";

// TODO: Replace this example table with actual tables for your database
export interface SecretsEntity {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export const secretsTable = sqliteTable("secrets_table", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export type SecretsEntityTest = Expect<
  Equal<SecretsEntity, typeof secretsTable.$inferSelect>
>;
