import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { Config } from "drizzle-kit";
import type { Schema, DbKey, DbOptions, DbConnection } from "./types.ts";

export class DbManager<S extends Schema, C extends Config> {
  private instances: Map<DbKey, DbConnection<S>>;
  private config: C;
  private schema: S;
  constructor(schema: S, c: C) {
    this.schema = schema;
    this.config = c;
    this.instances = new Map();
  }

  /**
   * Creates a "connection" to a
   */
  connect = (options?: DbOptions): DbKey => {
    let dbStorage = ":memory:";
    if (process.env.NODE_ENV === "test" && options?.inMemory !== false) {
      dbStorage = ":memory:";
    } else if (options?.dbPath) {
      dbStorage = options.dbPath;
    } else {
      dbStorage = ":memory:";
    }
    const sqlite = new Database(dbStorage);
    const db = drizzle(sqlite, { schema: this.schema });

    if (this.config.out) {
      migrate(db, {
        migrationsFolder: this.config.out,
      });
    }

    const key: DbKey = Symbol(`db-${Date.now()}-${Math.random()}`);
    this.instances.set(key, db);
    return key;
  };

  get(key: DbKey): DbConnection<S> | undefined {
    return this.instances.get(key);
  }

  disconnect = (key: DbKey): boolean => {
    const instance = this.instances.get(key);
    if (instance) {
      this.instances.delete(key);
      return true;
    }
    return false;
  };

  publicInterface() {
    return {
      connect: this.connect,
      disconnect: this.disconnect,
    };
  }
}
