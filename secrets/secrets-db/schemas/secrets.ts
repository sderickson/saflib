import { sqliteTable, text, integer, blob } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";

export interface SecretEntity {
  id: string;
  name: string;
  description: string | null;
  valueEncrypted: Buffer | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  isActive: boolean;
}

export const secretsTable = sqliteTable("secrets", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name").unique().notNull(),
  description: text("description"),
  valueEncrypted: blob("value_encrypted", { mode: "buffer" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  createdBy: text("created_by").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).default(true).notNull(),
});

export type SecretEntityTest = Expect<
  Equal<SecretEntity, typeof secretsTable.$inferSelect>
>;
