# Overview

This library provides a set of shared logic, documentation, and workflows for using a combination of [drizzle](https://orm.drizzle.team/) and [better-sqlite3](https://www.npmjs.com/package/better-sqlite3) to include [SQLite](https://sqlite.org/index.html) instances in the stack.

These docs explain how consumers of `@saflib/drizzle-sqlite3` should use this library within SAF applications.

## Package Structure

Each package which depends on `@saflib/drizzle-sqlite3` should have the following structure:

```
package-name/
├── data/
│   └── .gitkeep
├── drizzle.config.ts
├── errors.ts
├── index.ts
├── instances.ts
├── migrations/
├── package.json
├── queries/
│   └── <domain>/
│       ├── index.ts
│       ├── get-by-id.ts
│       ├── get-by-id.test.ts
│       └── ...
├── schema.ts
└── types.ts
```

### Data

SQLite files should be kept here. This provides a convenient mount point for containers.

## Required Files

### package.json

```json
{
  "name": "@saflib/your-package",
  "private": true,
  "type": "module",
  "main": "./index.ts",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "generate": "drizzle-kit generate"
  },
  "dependencies": {
    "@saflib/drizzle-sqlite3": "*"
  },
  "devDependencies": {
    "@saflib/vitest": "*"
  }
}
```

### drizzle.config.ts

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  out: "./migrations",
  schema: "./schema.ts",
  dialect: "sqlite",
});
```

### errors.ts

```typescript
import { HandledDatabaseError } from "@saflib/drizzle-sqlite3";

// Base error class for the database
export class YourDatabaseNameDatabaseError extends HandledDatabaseError {}

// Domain-specific errors extend the base error
export class UserNotFoundError extends YourDatabaseNameDatabaseError {}
export class EmailConflictError extends YourDatabaseNameDatabaseError {}
```

### instances.ts

```typescript
import { DbManager } from "@saflib/drizzle-sqlite3";
import * as schema from "./schema.ts";
import config from "./drizzle.config.ts";

export const mainDbManager = new DbManager(schema, config, import.meta.url);
```

### index.ts

```typescript
import { mainDbManager } from "./instances.ts";
import * as users from "./queries/users/index.ts";
import * as todos from "./queries/todos/index.ts";

export const mainDb = {
  ...mainDbManager.publicInterface(),
  users,
  todos,
};
```

### types.ts

Have "Input" variants which omit the fields that the query handles, so users of the query object don't have to provide those fields.

```typescript
import { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.ts";

// Global DB Type
export type DbType = BetterSQLite3Database<typeof schema>;

// --- Users --- //
export type User = typeof schema.users.$inferSelect;
export type NewUser = typeof schema.users.$inferInsert;
export type NewUserInput = Omit<NewUser, "createdAt" | "updatedAt">;

// --- Todos --- //
export type Todo = typeof schema.todos.$inferSelect;
export type NewTodo = typeof schema.todos.$inferInsert;
export type NewTodoInput = Omit<NewTodo, "createdAt" | "updatedAt">;
```

### queries/users/ (Example Domain)

**`index.ts`**

```typescript
import { getById } from "./get-by-id.ts";
import { create } from "./create.ts";

export const users = {
  getById,
  create,
};
```

**`get-by-id.ts`**

```typescript
import { queryWrapper } from "@saflib/drizzle-sqlite3";
import type { ReturnsError } from "@saflib/monorepo";
import { users } from "../../schema.ts";
import type { DbType, User } from "../../types.ts";
import { UserNotFoundError } from "../../errors.ts";
import type { DbKey } from "@saflib/drizzle-sqlite3";
import { mainDbManager } from "../../instances.ts";

type Result = ReturnsError<User, UserNotFoundError>;

export const getById = queryWrapper(
  async (dbKey: DbKey, id: number): Promise<Result> => {
    const db = mainDbManager.get(dbKey)!;

    const result = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, id),
    });

    if (!result) {
      return { error: new UserNotFoundError(id) };
    }

    return { result };
  },
);
```
