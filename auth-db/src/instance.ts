import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema.ts";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { AuthDatabaseError } from "./errors.ts";
import { getDbPath, getMigrationsPath } from "../drizzle.config.ts";
import { createUserQueries } from "./queries/users.ts";
import { createEmailAuthQueries } from "./queries/email-auth.ts";

export interface AuthDBConfig {
  dbPath?: string;
  migrationsPath?: string;
  inMemory?: boolean;
}

export class AuthDB {
  users: ReturnType<typeof createUserQueries>;
  emailAuth: ReturnType<typeof createEmailAuthQueries>;

  constructor(config: AuthDBConfig = {}) {
    try {
      const sqlite =
        config.inMemory || process.env.NODE_ENV === "test"
          ? new Database(":memory:")
          : new Database(config.dbPath || getDbPath());

      const db = drizzle(sqlite, { schema });

      // Run migrations
      migrate(db, {
        migrationsFolder: config.migrationsPath || getMigrationsPath(),
      });

      // Initialize query methods
      this.users = createUserQueries(db);
      this.emailAuth = createEmailAuthQueries(db);
    } catch (error) {
      throw new AuthDatabaseError(
        `Failed to initialize database: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
