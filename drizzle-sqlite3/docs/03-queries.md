# Queries

Queries are the "public" interface for the database. Services should not craft their own SQL queries, they should be housed in the "queries" folder of the database library and exported for general use. This enforces the following layering:

1. **Database Layer**: Uses `queryWrapper` to catch and classify database errors
2. **Service Layer**: Catches specific handled errors and reports generic errors for unhandled ones

This way, the database layer never exposes errors emitted by SQLite. If it did, service layers may try
to handle them directly and this would lead to tight coupling.

## File Organization

All queries should be organized by domain (table or logical group) within the `queries/` directory. Each specific query operation (get, list, create, update, delete) should reside in its **own file**. An `index.ts` file within each domain directory aggregates the individual query files.

```
package/
├── queries/
│   ├── todos/           # Domain directory for 'todos'
│   │   ├── index.ts     # Exports the todo queries
│   │   ├── get-by-id.ts # The getById query
│   │   ├── create.ts    # The create query
│   │   └── ...          # Other query files (list.ts, update.ts, etc.)
│   │   └── get-by-id.test.ts # Test for get-by-id.ts
│   │   └── ...          # Other test files
│   └── users/           # Domain directory for 'users'
│       └── ...          # (Similar structure)
├── index.ts             # Exports all domain queries and the public interface for the db
├── schema.ts            # Database schema
├── instance.ts          # Database instance and query factory initialization
├── types.ts             # Common DB types AND ALL domain-specific types
├── package.json
└── errors.ts            # Base error types
```

## Creating Database Queries with Error Handling

Each query file exports a queryWrapper'd function that takes a DbKey as its first parameter and returns the query result. Queries return errors using the `ReturnsError<TResult, TError>` pattern.

## Query and Related Files

**1. Domain Types (`types.ts`)**

All domain-specific types (like `Todo`, `NewTodo`, `CreateTodoInput`) should reside in the main `types.ts` file alongside the common `DbType`.

```typescript
// types.ts
import type * as schema from "../schema.ts";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

// Common DB type
export type DbType = BetterSQLite3Database<typeof schema>;

// --- Todos Domain --- //
export type Todo = typeof schema.todos.$inferSelect;
export type NewTodo = typeof schema.todos.$inferInsert;
export type CreateTodoInput = Omit<NewTodo, "id" | "createdAt">;

// --- Users Domain --- //
// ... other domain types ...
```

**2. Domain Errors (`errors.ts`)**

```typescript
// errors.ts
import { HandledDatabaseError } from "@saflib/drizzle-sqlite3";

export class YourDatabaseError extends HandledDatabaseError {}
export class TodoNotFoundError extends YourDatabaseError {}
export class TodoConflictError extends YourDatabaseError {}
```

**3. Individual Query File (`queries/todos/get-by-id.ts`)**

Query files now import types from the root `../types.ts`.

```typescript
// queries/todos/get-by-id.ts
import { queryWrapper } from "@saflib/drizzle-sqlite3";
import type { ReturnsError } from "@saflib/monorepo";
import { eq } from "drizzle-orm";
import { todos } from "../../schema.ts";
import type { Todo } from "../../types.ts";
import { TodoNotFoundError } from "../../errors.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { mainDbManager } from "../../instances.ts";

type Result = ReturnsError<Todo, TodoNotFoundError>;

export const getById = queryWrapper(
  async (dbKey: DbKey, id: string): Promise<Result> => {
    const db = mainDbManager.get(dbKey)!;
    const todo = await db.query.todos.findFirst({
      where: eq(todos.id, id),
    });

    if (!todo) {
      return { error: new TodoNotFoundError() };
    }

    return { result: todo };
  },
);
```

**4. Domain Index File (`queries/todos/index.ts`)**

```typescript
// queries/todos/index.ts
export { getById } from "./get-by-id.ts";
export { create } from "./create.ts";
// ... other exports
```

**5. Main Index File (`index.ts`)**

```typescript
export type * from "./types.ts";
export * from "./errors.ts";
import * as todos from "./queries/todos/index.ts";

import { yourDbManager } from "./instances.ts";

export const yourDb = {
  ...yourDbManager.publicInterface(),
  todos,
};
```

This structure ensures each file has a single, clear responsibility, improving modularity and testability.
