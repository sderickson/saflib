# Setting Up a Drizzle SQLite3 Library

This guide outlines the standard structure and setup for creating a Drizzle SQLite3 library in the monorepo.

## Package Structure

```
package-name/
├── package.json
├── drizzle.config.ts
├── data/              # SQLite database files
├── migrations/        # Generated migrations
└── src/              # Private implementation
    ├── schema.ts     # Database schema
    ├── instance.ts   # Database instance management
    ├── errors.ts     # Error handling
    └── queries/      # Database queries
        └── <table-name>.ts  # Table-specific queries
        └── <table-name>.test.ts  # Table-specific tests
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
    "generate": "drizzle-kit generate:sqlite"
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
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// Handle both ESM and CommonJS contexts
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export function getDbPath() {
  return "./data/database.sqlite";
}

export function getMigrationsPath() {
  return "./migrations";
}

export default {
  schema: "./src/schema.ts",
  out: getMigrationsPath(),
  driver: "better-sqlite",
  dbCredentials: {
    url: getDbPath(),
  },
};
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

### src/queries/users.ts

```typescript
import { users } from "../schema.ts";
import { DatabaseError } from "../errors.ts";
import { queryWrapper } from "@saflib/drizzle-sqlite3";
import { eq } from "drizzle-orm";

type NewUser = typeof users.$inferInsert;
type SelectUser = typeof users.$inferSelect;

export class UserNotFoundError extends DatabaseError {
  constructor() {
    super("User not found");
    this.name = "UserNotFoundError";
  }
}

export class EmailConflictError extends DatabaseError {
  constructor() {
    super("Email already exists");
    this.name = "EmailConflictError";
  }
}

export function createUserQueries(db: any) {
  return {
    UserNotFoundError,
    EmailConflictError,
    create: queryWrapper(async (user: NewUser): Promise<SelectUser> => {
      try {
        const now = new Date();
        const result = await db
          .insert(users)
          .values({ ...user, createdAt: now, updatedAt: now })
          .returning();
        return result[0];
      } catch (e: unknown) {
        if (
          e instanceof Error &&
          e.message.includes("UNIQUE constraint failed: users.email")
        ) {
          throw new EmailConflictError();
        }
        throw e;
      }
    }),

    getById: queryWrapper(async (id: number): Promise<SelectUser> => {
      const result = await db.query.users.findFirst({
        where: eq(users.id, id),
      });
      if (!result) {
        throw new UserNotFoundError();
      }
      return result;
    }),
  };
}
```

## Setup Steps

1. Create the package structure as shown above
2. Write your schema in `src/schema.ts` following the schema guidelines
3. Run `npm run generate` to create migrations
4. Implement your queries in `src/queries/` following the query guidelines and add them to your `instance.ts`
5. Write tests for your queries, adjacent to the query files

## Testing

When testing, the database will automatically use in-memory storage when `NODE_ENV=TEST`. This ensures each test starts with a fresh state.

Example test:

```typescript
import { describe, it, expect } from "vitest";
import { DatabaseInstance } from "./index.ts";

describe("User Queries", () => {
  it("creates and retrieves a user", async () => {
    const db = new DatabaseInstance();
    const user = await db.users.create({
      email: "test@example.com",
      name: "Test User",
    });

    const retrieved = await db.users.getById(user.id);
    expect(retrieved).toEqual(user);
  });
});
```
