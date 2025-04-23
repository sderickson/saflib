# Queries

Queries are the "public" interface for the database. Services should not craft their own SQL queries, they should be housed in the "queries" folder of the database library and exported for general use. This enforces the following layering:

1. **Database Layer**: Uses `queryWrapper` to catch and classify database errors
2. **Service Layer**: Catches specific handled errors and reports generic errors for unhandled ones

This way, the database layer never exposes errors emitted by SQLite. If it did, service layers may try
to handle them directly and this would lead to tight coupling.

## File Organization

All queries should be organized by domain (table or logical group) within the `src/queries/` directory. Each specific query operation (get, list, create, update, delete) should reside in its **own file**. An `index.ts` file within each domain directory aggregates the individual query factories.

```
src/
├── queries/
│   ├── index.ts         # Exports combined query objects (e.g., { todos, users })
│   ├── types.ts         # Common DB types (DbType, etc.)
│   ├── todos/           # Domain directory for 'todos'
│   │   ├── index.ts     # Exports the combined 'todos' query object
│   │   ├── types.ts     # Domain-specific types (Todo, NewTodo)
│   │   ├── errors.ts    # Domain-specific errors (TodoNotFoundError)
│   │   ├── get-by-id.ts # Factory for the getById query
│   │   ├── create.ts    # Factory for the create query
│   │   └── ...          # Other query files (list.ts, update.ts, etc.)
│   │   └── get-by-id.test.ts # Test for get-by-id.ts
│   │   └── ...          # Other test files
│   └── users/           # Domain directory for 'users'
│       └── ...          # (Similar structure)
├── schema.ts            # Database schema
├── instance.ts          # Database instance and query factory initialization
└── errors.ts            # Global/base error types (optional)
```

## Creating Database Queries with Error Handling

Each query file exports a factory function that takes the database instance and returns the specific query function, wrapped for error handling. Queries return errors using the `ReturnsError<TResult, TError>` pattern.

**1. Domain Types (`src/queries/todos/types.ts`)**

```typescript
// src/queries/todos/types.ts
import type * as schema from "../../schema.ts";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

// Re-export DB type if needed by query factories
export type DbType = BetterSQLite3Database<typeof schema>;

// Define domain-specific data types
export type Todo = typeof schema.todos.$inferSelect;
export type NewTodo = typeof schema.todos.$inferInsert;

// Input types for specific operations (example)
export type CreateTodoInput = Omit<NewTodo, "id" | "createdAt">;
```

**2. Domain Errors (`src/queries/todos/errors.ts`)**

```typescript
// src/queries/todos/errors.ts

// Define specific error classes (can inherit from a base DB error or Error)
export class TodoNotFoundError extends Error {
  constructor(id: string) {
    super(`Todo with ID ${id} not found`);
    this.name = "TodoNotFoundError";
  }
}

export class TodoConflictError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "TodoConflictError";
  }
}
```

**3. Individual Query File (`src/queries/todos/get-by-id.ts`)**

```typescript
// src/queries/todos/get-by-id.ts
import { queryWrapper } from "@saflib/drizzle-sqlite3";
import type { ReturnsError } from "@saflib/monorepo";
import { eq } from "drizzle-orm";
import { todos } from "../../schema.ts";
import type { DbType, Todo } from "./types.ts";
import { TodoNotFoundError } from "./errors.ts";

// Define the specific result type for this query
type Result = ReturnsError<Todo, TodoNotFoundError>;

// Export the factory function for this specific query
export function createGetTodoByIdQuery(db: DbType) {
  return queryWrapper(async (id: string): Promise<Result> => {
    const todo = await db.query.todos.findFirst({
      where: eq(todos.id, id),
    });

    if (!todo) {
      return { error: new TodoNotFoundError(id) }; // Return expected error
    }

    return { result: todo }; // Return successful result
  });
}
```

**4. Another Query File (`src/queries/todos/create.ts`)**

```typescript
// src/queries/todos/create.ts
import { queryWrapper } from "@saflib/drizzle-sqlite3";
import type { ReturnsError } from "@saflib/monorepo";
import { todos } from "../../schema.ts";
import type { CreateTodoInput, DbType, Todo } from "./types.ts";
import { TodoConflictError } from "./errors.ts";

// Define the specific result type for this query
type Result = ReturnsError<Todo, TodoConflictError>;

// Export the factory function for this specific query
export function createCreateTodoQuery(db: DbType) {
  return queryWrapper(async (data: CreateTodoInput): Promise<Result> => {
    try {
      const result = await db
        .insert(todos)
        .values({
          ...data,
          createdAt: new Date(), // Add fields not handled by input type
        })
        .returning();
      return { result: result[0] };
    } catch (e) {
      if (
        e instanceof Error &&
        e.message.includes("UNIQUE constraint failed") // Example check
      ) {
        return {
          error: new TodoConflictError("Todo uniqueness constraint failed", e),
        };
      }
      throw e; // Re-throw unexpected errors
    }
  });
}
```

**5. Domain Index File (`src/queries/todos/index.ts`)**

```typescript
// src/queries/todos/index.ts
import type { DbType } from "./types.ts";
import { createGetTodoByIdQuery } from "./get-by-id.ts";
import { createCreateTodoQuery } from "./create.ts";
// Import other query factories...

// Export domain-specific errors and types for convenience
export * from "./errors.ts";
export * from "./types.ts";

// Export a function that creates the full query object for this domain
export function createTodoQueries(db: DbType) {
  return {
    getById: createGetTodoByIdQuery(db),
    create: createCreateTodoQuery(db),
    // list: createListTodosQuery(db), // etc.
  };
}
```

**6. Main Instance Initialization (`src/instance.ts`)**

```typescript
// In src/instance.ts
import { drizzle } from "@saflib/drizzle-sqlite3";
import { Database } from "better-sqlite3";
import * as schema from "./schema.ts";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { DatabaseError } from "./errors.ts";
import { getDbPath, getMigrationsPath } from "../drizzle.config.ts";
import { createTodoQueries } from "./queries/todos/index.ts"; // Import the domain query factory
// Import other domain query factories (e.g., createUserQueries)

// ... DatabaseConfig interface ...

export class DatabaseInstance {
  // Define properties for each query domain
  todos: ReturnType<typeof createTodoQueries>;
  // users: ReturnType<typeof createUserQueries>;

  constructor(config: DatabaseConfig = {}) {
    try {
      // ... database connection setup ...
      const sqlite = new Database(/*...*/);
      const db = drizzle(sqlite, { schema });

      // ... migrations ...

      // Initialize query methods by calling the domain factories
      this.todos = createTodoQueries(db);
      // this.users = createUserQueries(db);
    } catch (error) {
      // ... error handling ...
    }
  }
}
```

This structure ensures each file has a single, clear responsibility, improving modularity and testability.

### Creating Custom Database Errors

While queries now _return_ errors for predictable failures using the `ReturnsError` pattern, defining custom error classes is still crucial.

These classes serve several purposes:

1.  **Identification:** Consumers of the query function can use `instanceof` checks on the `error` property of the returned object to determine _why_ the operation failed and handle it appropriately (e.g., `if (result.error instanceof TodoNotFoundError)`).
2.  **Consistency:** Provides a standard way to represent common database-related failures.
3.  **Information:** Custom errors can carry specific contextual information (like the ID that wasn't found).

Extend the base `Error` class or a custom `DatabaseError` base class:

```typescript
// Base error (optional, could be in src/errors.ts)
export class DatabaseError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DatabaseError";
  }
}

// Specific error types for your domain
export class DuplicateUserError extends DatabaseError {
  constructor(email: string) {
    super(`User with email ${email} already exists`);
    this.name = "DuplicateUserError";
  }
}

export class InvalidDataError extends DatabaseError {
  constructor(field: string, message?: string) {
    super(message || `Invalid data for field: ${field}`);
    this.name = "InvalidDataError";
  }
}

// Export these errors alongside the query functions that might return them.
```

Consumers can then reliably check the type of error returned:

```typitten
const { result, error } = await db.todos.getById("abc");

if (error) {
  if (error instanceof db.todos.TodoNotFoundError) {
    // Handle not found specifically
    console.log("Todo was not found.");
  } else {
    // Handle other potential errors returned by getById
    console.error("An unexpected error occurred:", error);
  }
} else {
  // Process the successful result
  console.log("Found todo:", result.title);
}
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

When querying data across multiple tables (e.g., fetching users and their profiles), **avoid returning nested object structures directly from the database query function.** Instead, adhere to the principle of [Flattened Data Structures](mdc:../../monorepo/docs/flattened-data.md).

**Recommendation:**

1.  **Select Specific Columns:** Use `.select({...})` to pick only the necessary columns from each joined table, including foreign keys.
2.  **Return Flat Records:** Return an array of flat records containing columns from all involved tables.
3.  **Handle Relationships Separately:** If a consumer needs related data (e.g., all posts for a user), they should perform a separate query using the relevant foreign key retrieved from the initial query.

This approach keeps database query functions focused, aligns with relational principles, promotes cacheability (especially in frontend state management), and avoids complex nested return types from the database layer.

```typescript
// Example: Get user with their profile ID (one-to-one)
// Service layer would perform a separate query for profile details if needed.
getUserWithProfileId: queryWrapper(async (userId: number): Promise<ReturnsError<{ user: User; profileId: number | null }, UserNotFoundError>> => {
  const result = await db
    .select({ // Select specific columns
      id: users.id,
      email: users.email,
      name: users.name,
      // ... other user fields
      profileId: profiles.id, // Select the related profile ID
    })
    .from(users)
    .leftJoin(profiles, eq(users.id, profiles.userId))
    .where(eq(users.id, userId));

  if (result.length === 0) {
    return { error: new UserNotFoundError(id) };
  }

  // Result is now a flat object, e.g., { id: 1, email: '...', name: '...', profileId: 123 }
  const userData = result[0];
  return { result: { user: { id: userData.id, email: userData.email, name: userData.name /* ... */ }, profileId: userData.profileId }};
}),
```

The consuming code receives the user data and the `profileId`. If the full profile is needed, it makes a separate `db.profiles.getById(profileId)` call.

### Upsert Pattern

For one-to-one relationships (like user profiles or settings), implement an "upsert" pattern:

```typescript
// In src/queries/profiles.ts
export function createProfileQueries(db: BetterSQLite3Database<typeof schema>) {
  return {
    // NOTE: The Upsert example needs significant changes to fit the ReturnsError pattern
    // and the single-query-per-file structure. Consider replacing complex upserts
    // with separate get/create/update calls handled by the service layer if the
    // combined logic becomes too cumbersome with explicit error returns.
    // ... rest of createProfileQueries ...
  };
}
```

### Error Handling

As shown in the examples, query functions should handle predictable errors (like "Not Found" or constraint violations) by returning `{ error: new SpecificError(...) }`. They should only `throw` truly _unexpected_ errors (e.g., database connection issues, programming errors caught during execution).

The `queryWrapper` can serve as a final safety net to catch these unexpected thrown errors, log them, and potentially wrap them in a generic `DatabaseError` before they propagate further (although its primary role shifts slightly away from catching _expected_ errors, which are now explicitly returned).

Consumers of the query functions **must** check the returned object for the `error` property before accessing `result`.

```typescript
// Example consumer code
async function processTodo(id: string) {
  const { result, error } = await db.todos.getById(id);

  if (error) {
    if (error instanceof db.todos.TodoNotFoundError) {
      console.warn(`Todo ${id} not found.`);
      // Return a specific value or throw an API-level error
      return null;
    } else {
      // Handle other potential error types returned by getById
      console.error(`Failed to get todo ${id}:`, error);
      throw new Error("Database operation failed"); // Or re-throw error
    }
  } else {
    // Safely use result
    console.log(`Processing todo: ${result.title}`);
    // ...
  }
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
