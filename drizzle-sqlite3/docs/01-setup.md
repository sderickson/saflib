# Setup

This guide outlines the standard structure and setup for creating a Drizzle SQLite3 library in the monorepo.

## Package Structure

```
package-name/
├── package.json
├── drizzle.config.ts
├── data/              # SQLite database files
│   └── .gitkeep       # Needed to make sure drizzle can write to the directory
├── migrations/        # Generated migrations
└── src/              # Private implementation
    ├── schema.ts     # Database schema
    ├── instance.ts   # Database instance management
    ├── errors.ts     # Base error types (optional)
    └── queries/      # Database queries
        ├── index.ts      # Exports combined query objects (e.g., { users, todos })
        ├── types.ts      # Common DB types (DbType, etc.)
        └── <domain>/     # Directory for a specific domain (e.g., users)
            ├── index.ts      # Exports the combined query object for the domain
            ├── types.ts      # Domain-specific types (e.g., User, NewUser)
            ├── errors.ts     # Domain-specific errors (e.g., UserNotFoundError)
            ├── get-by-id.ts  # Factory for a specific query
            ├── create.ts     # Factory for another query
            ├── ...           # Other query files (list.ts, update.ts, etc.)
            └── get-by-id.test.ts # Test file adjacent to query
            └── ...           # Other test files
```

## Required Files

### package.json

```json
{
  "name": "@saflib/your-package",
  "private": true,
  "type": "module",
  "exports": {
    ".": "./src/instance.ts"
  },
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
    "@saflib/drizzle-sqlite3-dev": "*",
    "@saflib/vitest": "*"
  }
}
```

### drizzle.config.ts

```typescript
import { defineConfig } from "drizzle-kit";
import path from "path";
import { fileURLToPath } from "url";

const getDirname = () => {
  const __filename = fileURLToPath(import.meta.url);
  return path.dirname(__filename);
};

const dbName = `database-${process.env.NODE_ENV}.sqlite`;

export const getDbPath = () => {
  return path.join(getDirname(), "data", dbName);
};

export const getMigrationsPath = () => {
  return path.join(getDirname(), "migrations");
};

export default defineConfig({
  out: "./migrations",
  schema: "./src/schema.ts",
  dialect: "sqlite",
  dbCredentials: { url: `./data/${dbName}` },
});
```

### src/errors.ts

```typescript
import { HandledDatabaseError } from "@saflib/drizzle-sqlite3";

export class DatabaseError extends HandledDatabaseError {
  constructor(message: string, cause?: unknown) {
    super(message, cause);
    this.name = "DatabaseError";
  }
}
```

### src/instance.ts

```typescript
import { drizzle } from "@saflib/drizzle-sqlite3";
import { Database } from "better-sqlite3";
import * as schema from "./schema.ts";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { DatabaseError } from "./errors.ts";
import { getDbPath, getMigrationsPath } from "../drizzle.config.ts";
import { createUserQueries } from "./queries/users.ts";

export interface DatabaseConfig {
  dbPath?: string;
  migrationsPath?: string;
  inMemory?: boolean;
}

export class DatabaseInstance {
  users: ReturnType<typeof createUserQueries>;

  constructor(config: DatabaseConfig = {}) {
    try {
      // Unless overridden by config, use an in-memory database for testing and file-based storage otherwise
      let dbStorage = ":memory:";
      if (config.dbPath) {
        dbStorage = config.dbPath;
      } else if (config.inMemory || process.env.NODE_ENV === "test") {
        dbStorage = ":memory:";
      } else {
        dbStorage = getDbPath();
      }
      const sqlite = new Database(dbStorage);

      const db = drizzle(sqlite, { schema });

      // Run migrations
      migrate(db, {
        migrationsFolder: config.migrationsPath || getMigrationsPath(),
      });

      // Initialize query methods
      this.users = createUserQueries(db);
    } catch (error) {
      throw new DatabaseError(
        `Failed to initialize database: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
```

### src/schema.ts

```typescript
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

// Export types for consumers
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

### src/queries/users/ (Example Domain)

**`types.ts`**

```typescript
// src/queries/users/types.ts
import type * as schema from "../../schema.ts";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

export type DbType = BetterSQLite3Database<typeof schema>;

export type User = typeof schema.users.$inferSelect;
export type NewUser = typeof schema.users.$inferInsert;

// Example input type
export type CreateUserInput = Omit<NewUser, "id" | "createdAt" | "updatedAt">;
```

**`errors.ts`**

```typescript
// src/queries/users/errors.ts
import { DatabaseError } from "../../errors.ts"; // Assuming a base error exists

// Define specific error classes
export class UserNotFoundError extends DatabaseError {
  constructor(id: number) {
    super(`User with ID ${id} not found`);
    this.name = "UserNotFoundError";
  }
}

export class EmailConflictError extends DatabaseError {
  constructor(email: string) {
    super(`Email ${email} already exists`);
    this.name = "EmailConflictError";
  }
}
```

**`create.ts`**

```typescript
// src/queries/users/create.ts
import { queryWrapper } from "@saflib/drizzle-sqlite3";
import type { ReturnsError } from "@saflib/monorepo";
import { users } from "../../schema.ts";
import type { CreateUserInput, DbType, User } from "./types.ts";
import { EmailConflictError } from "./errors.ts";

type Result = ReturnsError<User, EmailConflictError>;

export function createCreateUserQuery(db: DbType) {
  return queryWrapper(async (data: CreateUserInput): Promise<Result> => {
    try {
      const now = new Date();
      const result = await db
        .insert(users)
        .values({ ...data, createdAt: now, updatedAt: now })
        .returning();
      return { result: result[0] }; // Return success
    } catch (e: unknown) {
      if (
        e instanceof Error &&
        e.message.includes("UNIQUE constraint failed: users.email")
      ) {
        // Return expected constraint error
        return { error: new EmailConflictError(data.email) };
      }
      throw e; // Re-throw unexpected errors
    }
  });
}
```

**`get-by-id.ts`**

```typescript
// src/queries/users/get-by-id.ts
import { queryWrapper } from "@saflib/drizzle-sqlite3";
import type { ReturnsError } from "@saflib/monorepo";
import { eq } from "drizzle-orm";
import { users } from "../../schema.ts";
import type { DbType, User } from "./types.ts";
import { UserNotFoundError } from "./errors.ts";

type Result = ReturnsError<User, UserNotFoundError>;

export function createGetUserByIdQuery(db: DbType) {
  return queryWrapper(async (id: number): Promise<Result> => {
    const result = await db.query.users.findFirst({
      where: eq(users.id, id),
    });
    if (!result) {
      // Return expected not found error
      return { error: new UserNotFoundError(id) };
    }
    return { result: result }; // Return success
  });
}
```

**`index.ts`**

```typescript
// src/queries/users/index.ts
import type { DbType } from "./types.ts";
import { createCreateUserQuery } from "./create.ts";
import { createGetUserByIdQuery } from "./get-by-id.ts";

// Export errors and types for convenience
export * from "./errors.ts";
export * from "./types.ts"; // Optional: depends if consumers need User/NewUser directly

// Factory function aggregates individual query factories
export function createUserQueries(db: DbType) {
  return {
    // Expose query functions
    create: createCreateUserQuery(db),
    getById: createGetUserByIdQuery(db),
    // ...other queries

    // Expose error classes directly for instanceof checks
    UserNotFoundError,
    EmailConflictError,
  };
}
```

## Setup Steps

1. Create the package structure as shown above
2. Write your schema in `src/schema.ts` following the schema guidelines
3. Run `npm run generate` to create migrations
4. Implement your queries in the appropriate `src/queries/<domain>/` directory, with one file per query factory. Aggregate them in the domain's `index.ts` file and initialize them in `src/instance.ts`.
5. Write tests for your queries, adjacent to the query files (e.g., `src/queries/users/create.test.ts`).

## Testing

When testing, the database will automatically use in-memory storage when `NODE_ENV=TEST`. This ensures each test starts with a fresh state.

Example test:

```typescript
import { describe, it, expect } from "vitest";
import { DatabaseInstance } from "./index.ts";

describe("User Queries", () => {
  it("creates and retrieves a user", async () => {
    const db = new DatabaseInstance();
    const newUser = {
      email: "test@example.com",
      name: "Test User",
    };
    const createOutcome = await db.users.create(newUser);

    // Check if creation failed
    if (createOutcome.error) {
      throw createOutcome.error; // Fail test if creation unexpectedly fails
    }
    const createdUser = createOutcome.result;

    // Retrieve the user
    const retrieveOutcome = await db.users.getById(createdUser.id);

    // Check if retrieval failed
    if (retrieveOutcome.error) {
      throw retrieveOutcome.error; // Fail test if retrieval unexpectedly fails
    }
    const retrievedUser = retrieveOutcome.result;

    // Assert the retrieved user matches the created one (excluding timestamps)
    expect(retrievedUser.id).toEqual(createdUser.id);
    expect(retrievedUser.email).toEqual(newUser.email);
    expect(retrievedUser.name).toEqual(newUser.name);
  });

  it("returns UserNotFoundError for non-existent user", async () => {
    const db = new DatabaseInstance();
    const retrieveOutcome = await db.users.getById(999);

    expect(retrieveOutcome.error).toBeInstanceOf(db.users.UserNotFoundError);
    expect(retrieveOutcome.result).toBeUndefined();
  });

  it("returns EmailConflictError for duplicate email", async () => {
    const db = new DatabaseInstance();
    const user1 = {
      email: "duplicate@example.com",
      name: "User One",
    };
    const user2 = {
      email: "duplicate@example.com",
      name: "User Two",
    };

    const create1Outcome = await db.users.create(user1);
    expect(create1Outcome.error).toBeUndefined(); // First creation should succeed

    const create2Outcome = await db.users.create(user2);
    expect(create2Outcome.error).toBeInstanceOf(db.users.EmailConflictError);
    expect(create2Outcome.result).toBeUndefined();
  });
});
```
