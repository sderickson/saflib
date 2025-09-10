import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import type { Expect, Equal } from "@saflib/drizzle";

// Users table for the test database
export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export const usersTable = sqliteTable("users", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// Type assertion to ensure the interface matches the schema
export type UserTest = Expect<Equal<User, typeof usersTable.$inferSelect>>;
