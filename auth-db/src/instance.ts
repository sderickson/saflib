import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema.ts";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { AuthDatabaseError } from "./errors.ts";

export interface AuthDBConfig {
  dbPath?: string;
  migrationsPath: string;
  inMemory?: boolean;
}

export class AuthDB {
  private db: ReturnType<typeof drizzle>;

  constructor(config: AuthDBConfig) {
    try {
      const sqlite = config.inMemory
        ? new Database(":memory:")
        : new Database(config.dbPath || ":memory:");

      this.db = drizzle(sqlite, { schema });

      // Run migrations
      migrate(this.db, { migrationsFolder: config.migrationsPath });
    } catch (error) {
      throw new AuthDatabaseError(
        `Failed to initialize database: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  get instance() {
    return this.db;
  }
}
