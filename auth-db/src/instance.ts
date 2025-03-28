import { BetterSQLite3Database, drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema.ts";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { AuthDatabaseError } from "./errors.ts";
import { getDbPath, getMigrationsPath } from "../drizzle.config.ts";
import { createUserQueries } from "./queries/users.ts";
import { createEmailAuthQueries } from "./queries/email-auth.ts";
import { createPermissionQueries } from "./queries/permissions.ts";

export interface AuthDBConfig {
  dbPath?: string;
  migrationsPath?: string;
  inMemory?: boolean;
}

export class AuthDB {
  db: BetterSQLite3Database<typeof schema>;

  users: ReturnType<typeof createUserQueries>;
  emailAuth: ReturnType<typeof createEmailAuthQueries>;
  permissions: ReturnType<typeof createPermissionQueries>;

  constructor(config: AuthDBConfig = {}) {
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

      this.db = drizzle(sqlite, { schema });

      // Run migrations
      migrate(this.db, {
        migrationsFolder: config.migrationsPath || getMigrationsPath(),
      });

      // Initialize query methods
      this.users = createUserQueries(db);
      this.emailAuth = createEmailAuthQueries(db);
      this.permissions = createPermissionQueries(db);
    } catch (error) {
      throw new AuthDatabaseError(
        `Failed to initialize database: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
