# Table Schemas

When defining Drizzle table schemas, please follow these guidelines.

## Data Types

- **JSON Data**: Use `text` with `{ mode: "json" }` for JSON data

  ```typescript
  preferences: text("preferences", { mode: "json" }).$type<string[]>(),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  ```

- **Timestamps**: Use `integer` with `{ mode: "timestamp" }` for dates

  ```typescript
  created_at: integer("created_at", { mode: "timestamp" }).notNull(),
  updated_at: integer("updated_at", { mode: "timestamp" }).notNull(),
  ```

- **Currency**: Use `integer` for monetary values (store in cents or other lowest denomination)
  ```typescript
  price: integer("price").notNull(),
  ```

## Indexes

- Use the array syntax within the table definition to define indexes.

  ```typescript
  import {
    integer,
    text,
    index,
    uniqueIndex,
    sqliteTable,
  } from "drizzle-orm/sqlite-core";

  export const user = sqliteTable(
    "user",
    {
      id: text("id").primaryKey({ autoIncrement: true }),
      name: text("name"),
      email: text("email"),
    },
    (table) => [
      index("name_idx").on(table.name),
      uniqueIndex("email_idx").on(table.email),
    ],
  );
  ```
