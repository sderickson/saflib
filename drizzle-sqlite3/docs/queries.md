# Writing Queries

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

// Define specific handled errors
export class TodoNotFoundError extends HandledDatabaseError {
  constructor(id: string) {
    super(`Todo with ID ${id} not found`, "TODO_NOT_FOUND");
  }
}

// Export a factory function that takes a db instance
export function createTodoQueries(db: any) {
  return {
    TodoNotFoundError,
    // Wrap database queries to standardize error handling
    getById: queryWrapper(async (id: string) => {
      const todo = await db.query.todos.findFirst({
        where: eq(todos.id, id),
      });

      if (!todo) {
        throw new TodoNotFoundError(id);
      }

      return todo;
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

### Upsert Pattern

For one-to-one relationships (like user profiles or settings), implement an "upsert" pattern:

```typescript
// In src/queries/profiles.ts
export function createProfileQueries(db: any) {
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

## Development

1. Run tests:

   ```bash
   pnpm test
   ```

2. Run tests in watch mode:

   ```bash
   pnpm test:watch
   ```

3. Run tests with coverage:
   ```bash
   pnpm test:coverage
   ```
