// Types for the test-database package
// Re-exports of Drizzle's $inferInsert or $inferSelect, or altered versions

export type * from "./schema.ts";

// Import the table to get inferred types
import { usersTable } from "./schema.ts";

// Export inferred types for the users table
export type User = typeof usersTable.$inferSelect;
export type InsertUserParams = Omit<
  typeof usersTable.$inferInsert,
  "id" | "createdAt" | "updatedAt"
>;
export type UpdateUserParams = Partial<InsertUserParams>;
