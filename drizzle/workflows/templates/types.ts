// TODO: Add types for your database package
// These are typically re-exports of Drizzle's $inferInsert or $inferSelect,
// or altered versions of those using Pick or Omit

export type * from "./schema.ts";

// Re-export commonly used types for convenience
// Example:
// import type { ExampleEntity } from "./schemas/example.ts";
// export type { ExampleEntity };
// export type CreateExampleParams = Omit<
//   ExampleEntity,
//   "id" | "createdAt" | "updatedAt"
// >;
