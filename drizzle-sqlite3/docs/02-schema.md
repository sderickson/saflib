# Schema

When defining Drizzle schemas, please follow these more-specific guidelines.

## Data Types

- **IDs**: Use `integer` type for primary keys and foreign keys

  ```typescript
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  ```

- **JSON Data**: Use `text` with `{ mode: "json" }` for JSON data

  ```typescript
  preferences: text("preferences", { mode: "json" }).$type<string[]>(),
  metadata: text("metadata", { mode: "json" }).$type<Record<string, unknown>>(),
  ```

- **Timestamps**: Use `integer` with `{ mode: "timestamp" }` for dates

  ```typescript
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ```

- **Currency**: Use `integer` for monetary values (store in cents or other lowest denomination)
  ```typescript
  price: integer("price").notNull(),
  ```

## Relationships

- **User IDs**: For external user IDs (from auth service), use `integer` type

  ```typescript
  userId: integer("user_id").notNull().unique(),
  ```

- **One-to-One Relationships**: Add unique constraints
  ```typescript
  profileId: integer("profile_id").notNull().unique(),
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
      id: integer("id").primaryKey({ autoIncrement: true }),
      name: text("name"),
      email: text("email"),
    },
    (table) => [
      index("name_idx").on(table.name),
      uniqueIndex("email_idx").on(table.email),
    ],
  );
  ```

## After Making Schema Changes

After making any changes to schema files:

1. Run `npm run generate` from the database package root
2. This will create a new migration file in the `migrations` directory
3. No schema-specific tests are needed - testing is done at the query level

Note: Schema changes should be committed along with their generated migration files.
