import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { Config } from "drizzle-kit";
import type { Schema, DbKey, DbOptions, DbConnection } from "./types.ts";
import path from "path";
import fs from "fs";
import { makeSubsystemReporters } from "@saflib/node";
import { typedEnv } from "@saflib/env";

/**
 * A class which mainly manages "connections" to the sqlite3 database and drizzle
 * ORM. Any package which depends on this will create a single instance given the
 * database schema and config, export the public interface, and be used by queries
 * to access the drizzle ORM. This way the package which depends on
 * `@saflib/drizzle-sqlite3` has full access to its database, but packages
 * which depend on *it* only have access to an opaque key which only database
 * queries can use.
 */
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
    const { log } = makeSubsystemReporters("init", "db.connect");
    log.info("Connecting to database...");
    let dbStorage = ":memory:";
    if (options?.onDisk === true) {
      dbStorage = path.join(
        this.rootPath,
        "data",
        `db-${typedEnv.DEPLOYMENT_NAME}.sqlite`,
      );
      if (options?.doNotCreate) {
        const exists = fs.existsSync(dbStorage);
        if (!exists && typedEnv.ALLOW_DB_CREATION !== "true") {
          throw new Error(`Database file does not exist: ${dbStorage}`);
        } else if (!exists) {
          log.warn(`Creating database file: ${dbStorage}`);
        } else {
          log.info(`Database file found at: ${dbStorage}`);
        }
      }
    } else if (options?.onDisk) {
      dbStorage = options.onDisk;
    } else {
      dbStorage = ":memory:";
    }
    log.info(`Connecting to database: ${dbStorage}`);
    const sqlite = new Database(dbStorage);
    const db = drizzle(sqlite, { schema: this.schema });

    if (this.config.out) {
      log.info("Running migrations...");
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
