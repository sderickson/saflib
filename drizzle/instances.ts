import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { Config } from "drizzle-kit";
import type { Schema, DbKey, DbOptions, DbConnection } from "./types.ts";
import path from "path";
import fs from "fs";
import { makeSubsystemReporters } from "@saflib/node";
import { typedEnv } from "@saflib/env";
import { randomUUID } from "crypto";

/**
 * A class which mainly manages "connections" to the sqlite3 database and drizzle
 * ORM. Any package which depends on this will create a single instance given the
 * database schema and config, export the public interface, and be used by queries
 * to access the drizzle ORM. This way the package which depends on
 * `@saflib/drizzle` has full access to its database, but packages
 * which depend on *it* only have access to an opaque key which only database
 * queries can use.
 */
export class DbManager<S extends Schema, C extends Config> {
  private instances: Map<DbKey, DbConnection<S>>;
  private config: C;
  private schema: S;
  private rootPath: string;
  private activeBackups: Set<string>;

  constructor(schema: S, c: C, rootUrl: string) {
    this.config = c;
    this.schema = schema;
    this.instances = new Map();
    this.activeBackups = new Set();
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
      const exists = fs.existsSync(dbStorage);
      if (
        !exists &&
        typedEnv.ALLOW_DB_CREATION !== "true" &&
        typedEnv.NODE_ENV !== "test"
      ) {
        throw new Error(`Database file does not exist: ${dbStorage}`);
      } else if (!exists) {
        log.warn(`Creating database file: ${dbStorage}`);
      } else {
        log.info(`Database file found at: ${dbStorage}`);
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
      try {
        migrate(db, {
          migrationsFolder: migrationsPath,
        });
      } catch (error) {
        if (error instanceof Error && error.cause) {
          log.error(error.stack);
          log.error(`Cause:\n\n${error.cause}\n\n`);
        }
        throw error;
      }
    }

    const key: DbKey = Symbol(`db-${Date.now()}-${Math.random()}`);
    this.instances.set(key, db);
    return key;
  };

  /**
   * Creates a backup of the database file and returns a buffer with automatic cleanup.
   * The backup file is created in the same directory as the original database file
   * with a unique temporary name. The buffer will automatically clean up the temporary
   * file when it's closed or garbage collected.
   *
   * @param key The database key to backup
   * @returns A buffer containing the database backup, or undefined if the database doesn't exist
   */
  createBackup(key: DbKey): Buffer | undefined {
    const { log } = makeSubsystemReporters("init", "db.createBackup");
    const instance = this.instances.get(key);
    if (!instance) {
      log.warn("Cannot create backup: database instance not found");
      return undefined;
    }

    // Get the database file path from the SQLite instance
    const db = (instance as any).$db;
    if (!db || typeof db.name !== "string") {
      log.warn(
        "Cannot create backup: database is in-memory or path not accessible",
      );
      return undefined;
    }

    const originalPath = db.name;
    if (originalPath === ":memory:") {
      log.warn("Cannot create backup: database is in-memory");
      return undefined;
    }

    if (!fs.existsSync(originalPath)) {
      log.warn(
        `Cannot create backup: database file does not exist at ${originalPath}`,
      );
      return undefined;
    }

    // Create a unique temporary backup file
    const backupId = randomUUID();
    const backupPath = `${originalPath}.backup.${backupId}`;

    try {
      log.info(`Creating backup: ${originalPath} -> ${backupPath}`);
      fs.copyFileSync(originalPath, backupPath);
      this.activeBackups.add(backupPath);

      // Read the backup file into a buffer
      const buffer = fs.readFileSync(backupPath);

      // Create a custom buffer that cleans up the file when closed
      const backupBuffer = Buffer.from(buffer);

      // Add cleanup method to the buffer
      (backupBuffer as any).__cleanup = () => {
        this.cleanupBackup(backupPath);
      };

      // Set up automatic cleanup on garbage collection
      if (global.gc) {
        // In environments with explicit GC, we can't rely on finalization
        // The user should call cleanup manually or use the buffer quickly
        log.info("Backup created with manual cleanup required");
      } else {
        // Use FinalizationRegistry for automatic cleanup
        const registry = new FinalizationRegistry((backupPath: string) => {
          this.cleanupBackup(backupPath);
        });
        registry.register(backupBuffer, backupPath);
      }

      log.info(`Backup created successfully: ${buffer.length} bytes`);
      return backupBuffer;
    } catch (error) {
      log.error(`Failed to create backup: ${error}`);
      // Clean up the backup file if it was created but something else failed
      if (fs.existsSync(backupPath)) {
        try {
          fs.unlinkSync(backupPath);
        } catch (cleanupError) {
          log.error(`Failed to cleanup backup file: ${cleanupError}`);
        }
      }
      throw error;
    }
  }

  /**
   * Manually clean up a backup file. This is called automatically when the buffer
   * is garbage collected, but can be called manually for immediate cleanup.
   */
  private cleanupBackup(backupPath: string): void {
    const { log } = makeSubsystemReporters("db", "db.cleanupBackup");

    if (this.activeBackups.has(backupPath)) {
      try {
        if (fs.existsSync(backupPath)) {
          fs.unlinkSync(backupPath);
          log.info(`Cleaned up backup file: ${backupPath}`);
        }
        this.activeBackups.delete(backupPath);
      } catch (error) {
        log.error(`Failed to cleanup backup file ${backupPath}: ${error}`);
      }
    }
  }

  /**
   * Clean up all active backup files. Useful for shutdown procedures.
   */
  cleanupAllBackups(): void {
    const { log } = makeSubsystemReporters("db", "db.cleanupAllBackups");
    log.info(`Cleaning up ${this.activeBackups.size} active backup files`);

    for (const backupPath of this.activeBackups) {
      try {
        if (fs.existsSync(backupPath)) {
          fs.unlinkSync(backupPath);
        }
      } catch (error) {
        log.error(`Failed to cleanup backup file ${backupPath}: ${error}`);
      }
    }

    this.activeBackups.clear();
    log.info("All backup files cleaned up");
  }

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
      createBackup: this.createBackup.bind(this),
      cleanupAllBackups: this.cleanupAllBackups.bind(this),
    };
  }
}
