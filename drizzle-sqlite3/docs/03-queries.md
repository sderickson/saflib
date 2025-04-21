# Queries

Queries are the "public" interface for the database. Services should not craft their own SQL queries, they should be housed in the "queries" folder of the database library and exported for general use. This enforces the following layering:

1. **Database Layer**: Uses `queryWrapper` to catch and classify database errors
2. **Service Layer**: Catches specific handled errors and reports generic errors for unhandled ones

This way, the database layer never exposes errors emitted by SQLite. If it did, service layers may try
to handle them directly and this would lead to tight coupling.

## File Organization

All queries should be organized in the following structure:

```
src/
├── queries/           # All query files go here
│   ├── users.ts      # User-related queries
│   ├── users.test.ts # Tests for user queries
│   ├── todos.ts      # Todo-related queries
│   └── todos.test.ts # Tests for todo queries
├── schema.ts         # Database schema
├── instance.ts       # Database instance and query factory initialization
└── errors.ts         # Error types
```

## Creating Database Queries with Error Handling

Each query file should export a factory function that takes a database instance and returns an object with query methods:

```typescript
// In src/queries/todos.ts
import { queryWrapper, HandledDatabaseError } from "@saflib/drizzle-sqlite3";
import { eq } from "drizzle-orm";
import { todos } from "../schema.ts";
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "../schema.ts";

// Define specific handled errors
export class TodoNotFoundError extends HandledDatabaseError {
  constructor(id: string) {
    super(`Todo with ID ${id} not found`, "TODO_NOT_FOUND");
  }
}

// Export a factory function that takes a db instance
export function createTodoQueries(db: BetterSQLite3Database<typeof schema>) {
  // type based on what instance.ts exports

  // Define input/output types using Drizzle's inference where possible
  type Todo = typeof schema.todos.$inferSelect;
  type NewTodo = typeof schema.todos.$inferInsert;

  return {
    TodoNotFoundError,
    // Wrap database queries to standardize error handling
    // Note: Explicit return types (e.g., Promise<Todo>) on the async function
    // are often optional, as TypeScript can infer them from Drizzle's results.
    getById: queryWrapper(async (id: string) => {
      const todo = await db.query.todos.findFirst({
        where: eq(todos.id, id),
      });

      if (!todo) {
        throw new TodoNotFoundError(id);
      }

      return todo;
    }),

    createTodo: queryWrapper(async (data: NewTodo) => {
      // Example using inferred insert type
      const result = await db
        .insert(schema.todos)
        .values({
          ...data,
          createdAt: new Date(), // Add fields not in the base type
        })
        .returning();
      return result[0];
    }),
  };
}
```

Then in your instance.ts, initialize the queries:

```typescript
// In src/instance.ts
import { createTodoQueries } from "./queries/todos.ts";

export class DatabaseInstance {
  todos: ReturnType<typeof createTodoQueries>;

  constructor(config: DatabaseConfig = {}) {
    try {
      // ... database initialization ...

      // Initialize query methods
      this.todos = createTodoQueries(db);
    } catch (error) {
      throw new DatabaseError(
        `Failed to initialize database: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
```

### Creating Custom Database Errors

Extend the `HandledDatabaseError` class to create specific error types:

```typescript
import { HandledDatabaseError } from "@saflib/drizzle-sqlite3";

// Create specific error types for your domain
export class DuplicateUserError extends HandledDatabaseError {
  constructor(email: string) {
    super(`User with email ${email} already exists`, "DUPLICATE_USER");
  }
}

export class InvalidDataError extends HandledDatabaseError {
  constructor(field: string) {
    super(`Invalid data for field: ${field}`, "INVALID_DATA");
  }
}

// Export these errors for consumers to catch
```

## Query Pattern Best Practices

### Defining Input and Output Types

Leverage Drizzle's inferred types (`$inferSelect` for selection results, `$inferInsert` for insertion data) as the base for your function inputs and outputs.

However, for functions like `create` or `update`, the exact input required often differs slightly from the base `$inferInsert` or `$inferSelect` types. Create specific `Input` types using TypeScript's utility types (`Omit`, `Partial`, `Pick`, `&`) to precisely define the expected shape:

- **Create Operations:** Start with `$inferInsert`. `Omit` fields automatically handled by the database (e.g., `id`, `createdAt`, `updatedAt`).
- **Update Operations:** Often require the `id` of the record. Start with `$inferSelect` or `$inferInsert`, make relevant fields `Partial`, `Omit` fields that shouldn't be updated (e.g., `id` itself within the payload, `createdAt`, `ownerId`), and explicitly add back required identifiers using `& { id: number }`.

```typescript
import * as schema from '../schema';

// Base types inferred from schema
export type User = typeof schema.users.$inferSelect;
export type NewUser = typeof schema.users.$inferInsert;

// --- Input Types ---

// For creating a user: Omit DB-handled fields
export type CreateUserInput = Omit<NewUser, 'id' | 'createdAt' | 'updatedAt'>;

// For updating a user: Make fields optional, omit protected/DB fields. Require unique identifiers such as id.
export type UpdateUserInput = Partial<Omit<User, 'ownerId' | 'createdAt' | 'updatedAt'>> & { id: number };

// --- Query Functions ---

export function createUserQueries(db) {
  return {
    // Return type is inferred
    getUser: queryWrapper(async (id: number) => { ... }),

    // Create: just CreateUserInput type
    createUser: queryWrapper(async (data: CreateUserInput) => {
        const result = await db.insert(schema.users).values({
            ...data,
            createdAt: new Date(),
            updatedAt: new Date()
        }).returning();
        return result[0];
     }),

    // Update: just UpdateUserInput type, which includes identifier and fields to update
    updateUser: queryWrapper(async (data: UpdateUserInput) => {
        // Do any data validation here
        const result = await db.update(schema.users).set({
            ...data,
            updatedAt: new Date(), // Update timestamp
        }).where(eq(schema.users.id, id)).returning();

        if (result.length === 0) throw new UserNotFoundError(id);
        return result[0];
    }),

    // Delete: Takes only the id
    deleteUser: queryWrapper(async (id: number) => { ... })
  }
}
```

### Function Signatures

Design function signatures to be clear and prevent redundancy:

- If an operation doesn't need record data (get, delete), pass identifying information (like `id`, `slug`, `email`, etc.) as an argument and name the function accordingly (getBySlug, deleteByEmail).
- If there's a data payload object (e.g., `UpdateUserInput`), it should contain these identifiers, rather than requiring separate arguments.
- For create operations, no generated identifiers are needed.

This separation makes the function's purpose and requirements explicit.

### Simplified Inserts and Updates using Spread

Within the function implementation, when the (potentially modified) input data object aligns well with the table structure, use the spread operator (`...`) for conciseness in `insert().values()` and `update().set()`.

```typescript
// Example: Inserting using spread
create: queryWrapper(async (data: NewUser) => {
  const now = new Date();
  const result = await db.insert(users).values({
    ...data,
    createdAt: now,
    updatedAt: now,
  }).returning();
  return result[0];
}),

// Example: Updating using spread
update: queryWrapper(async (id: number, data: Partial<User>) => {
  const result = await db.update(users).set({
    ...data,
    updatedAt: new Date(),
  }).where(eq(users.id, id)).returning();
  return result[0];
}),
```

### Handling Joins

When querying data across multiple tables using joins (`leftJoin`, `innerJoin`, etc.), Drizzle's default `select()` returns a nested structure containing objects for each table involved (e.g., `{ tableA: {...}, tableB: {...} }`).

**Recommendation:** Return this nested structure directly from your query function. Avoid manually flattening or mapping the result within the query function itself. This keeps the database query logic simple and delegates the responsibility of handling the specific data shape to the service layer or consumer.

```typescript
// Example: Get user with their profile (one-to-one)
getUserWithProfile: queryWrapper(async (userId: number) => {
  const result = await db
    .select() // Selects all columns from both tables, nested
    .from(users)
    .leftJoin(profiles, eq(users.id, profiles.userId))
    .where(eq(users.id, userId));

  // Returns structure like: { users: User, profiles: Profile | null }[]
  if (result.length === 0) return undefined;
  return result[0];
}),
```

The consuming code would then access properties like `result.users.email` or `result.profiles?.bio`.

### Upsert Pattern

For one-to-one relationships (like user profiles or settings), implement an "upsert" pattern:

```typescript
// In src/queries/profiles.ts
export function createProfileQueries(db: BetterSQLite3Database<typeof schema>) {
  return {
    upsert: queryWrapper(
      async (
        userId: number,
        profileData: Partial<NewUserProfile>,
      ): Promise<UserProfile> => {
        // Check if a profile already exists for this user
        const existingProfile = await db
          .select()
          .from(userProfiles)
          .where(eq(userProfiles.userId, userId));

        if (existingProfile.length > 0) {
          // Update existing profile
          const result = await db
            .update(userProfiles)
            .set({
              ...profileData,
              updatedAt: new Date(),
            })
            .where(eq(userProfiles.userId, userId))
            .returning();

          return result[0];
        } else {
          // Create a new profile
          const result = await db
            .insert(userProfiles)
            .values({
              userId,
              ...profileData,
              updatedAt: new Date(),
            })
            .returning();

          return result[0];
        }
      },
    ),
  };
}
```

### Error Handling

Always create specific error classes for common error cases:

```typescript
export class ProfileNotFoundError extends MainDatabaseError {
  constructor(userId: number) {
    super(`Profile for user with id ${userId} not found`);
  }
}
```

### Validation

Perform validation before database operations. It is the responsibility of the database layer to ensure data integrity.

```typescript
if (!isValidEmail(email)) {
  throw new InvalidDataError("email");
}
```

### Testing

Tests should be in the fuzzy space between unit and integration tests; they should include the database itself to ensure the queries work as expected with the database client and database. SQLite makes this easy by being able to be run in-memory.

Example test:

```typescript
// In src/queries/todos.test.ts
import { describe, it, expect } from "vitest";
import { DatabaseInstance } from "../instance.ts";

describe("Todo Queries", () => {
  it("creates and retrieves a todo", async () => {
    const db = new DatabaseInstance();
    const todo = await db.todos.create({
      title: "Test Todo",
      completed: false,
    });

    const retrieved = await db.todos.getById(todo.id);
    expect(retrieved).toEqual(todo);
  });
});
```
