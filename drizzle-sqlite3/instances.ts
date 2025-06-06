import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { Config } from "drizzle-kit";
import type { Schema, DbKey, DbOptions, DbConnection } from "./types.ts";
import path from "path";
import fs from "fs";

export class DbManager<S extends Schema, C extends Config> {
  private instances: Map<DbKey, DbConnection<S>>;
  private config: C;
  private schema: S;
  private rootPath: string;

  constructor(schema: S, c: C, rootUrl: string) {
    this.config = c;
    this.schema = schema;
    this.instances = new Map();
    if (!rootUrl.startsWith("file://")) {
      throw new Error("Root URL must start with 'file://'");
    }
    this.rootPath = path.dirname(rootUrl.replace("file://", ""));
  }

  /**
   * Creates a "connection" to a database.
   *
   * If onDisk is true, the database will be created on disk, in a "data" folder, with the name of the current environment.
   * If onDisk is a string, the database will be created at the given (absolute) path.
   */
  connect = (options?: DbOptions): DbKey => {
    let dbStorage = ":memory:";
    if (options?.onDisk === true) {
      dbStorage = path.join(
        this.rootPath,
        "data",
        `db-${process.env.NODE_ENV}.sqlite`,
      );
      console.log("dbStorage", dbStorage);
      if (options?.doNotCreate) {
        const exists = fs.existsSync(dbStorage);
        if (!exists) {
          throw new Error(`Database file does not exist: ${dbStorage}`);
        }
      }
    } else if (options?.onDisk) {
      dbStorage = options.onDisk;
    } else {
      dbStorage = ":memory:";
    }
    const sqlite = new Database(dbStorage);
    const db = drizzle(sqlite, { schema: this.schema });

    if (this.config.out) {
      let migrationsPath = this.config.out;
      if (migrationsPath.startsWith("./")) {
        migrationsPath = path.join(this.rootPath, migrationsPath);
      }
      migrate(db, {
        migrationsFolder: migrationsPath,
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
