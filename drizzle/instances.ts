import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { Config } from "drizzle-kit";
import type { Schema, DbKey, DbOptions, DbConnection, DbManagerOptions } from "./types.ts";
import path from "path";
import fs from "fs";
import { makeSubsystemReporters } from "@saflib/node";
import { typedEnv } from "./env.ts";
import { randomUUID } from "crypto";
import { Readable } from "node:stream";
import { reconcileSquashedMigrations } from "./reconcile-squashed-migrations.ts";

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
  private dbPaths: Map<DbKey, string>;
  private defaultPragmas: Record<string, string | number>;

  constructor(schema: S, c: C, rootUrl: string, options?: DbManagerOptions) {
    this.config = c;
    this.schema = schema;
    this.instances = new Map();
    this.activeBackups = new Set();
    this.dbPaths = new Map();
    this.defaultPragmas = options?.defaultPragmas ?? {};
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

    // by default, all tests should use in-memory databases, unless explicitly overridden
    if (typedEnv.NODE_ENV === "test" && !options?.overrideTestDefault) {
      dbStorage = ":memory:";
    }

    log.info(`Connecting to database: ${dbStorage}`);
    const sqlite = options?.readonly
      ? new Database(dbStorage, { readonly: true, fileMustExist: true })
      : new Database(dbStorage);
    this.applyPragmas(sqlite, options?.pragmas);
    const db = drizzle(sqlite, { schema: this.schema });

    if (
      this.config.out &&
      !options?.readonly &&
      !options?.skipMigrations
    ) {
      this.runMigrations(sqlite, db, log);
    }

    const key: DbKey = Symbol(`db-${Date.now()}-${Math.random()}`);
    this.instances.set(key, db);
    this.dbPaths.set(key, dbStorage);
    return key;
  };

  private runMigrations = (
    sqlite: Database.Database,
    db: DbConnection<S>,
    log: { info: (message: string) => void; error: (message: string) => void },
  ): void => {
    log.info("Running migrations...");
    let migrationsPath = this.config.out!;
    if (migrationsPath.startsWith("./")) {
      migrationsPath = path.join(this.rootPath, migrationsPath);
    }
    try {
      reconcileSquashedMigrations(sqlite, migrationsPath, {
        info: (message) => log.info(message),
        warn: (message) => log.info(message),
      });
      migrate(db, {
        migrationsFolder: migrationsPath,
      });
    } catch (error) {
      if (error instanceof Error && error.cause) {
        log.error(error.stack ?? String(error));
        log.error(`Cause:\n\n${error.cause}\n\n`);
      }
      throw error;
    }
  };

  /**
   * Creates a backup of the database file and returns a readable stream with automatic cleanup.
   * The backup file is created in the same directory as the original database file
   * with a unique temporary name. The stream will automatically clean up the temporary
   * file when it's closed or garbage collected.
   */
  async createBackup(key: DbKey): Promise<Readable | undefined> {
    const { log } = makeSubsystemReporters("init", "db.createBackup");
    const instance = this.instances.get(key);
    if (!instance) {
      log.warn("Cannot create backup: database instance not found");
      return undefined;
    }

    if (typedEnv.NODE_ENV === "test") {
      return Readable.from("test backup");
    }

    // Get the database file path from our stored paths
    const originalPath = this.dbPaths.get(key);
    if (!originalPath) {
      log.warn("Cannot create backup: database path not found");
      return undefined;
    }

    if (originalPath === ":memory:") {
      log.warn("Cannot create backup: database is in-memory");
      return undefined;
    }

    if (!(await fs.promises.stat(originalPath)).isFile()) {
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
      await fs.promises.copyFile(originalPath, backupPath);
      this.activeBackups.add(backupPath);

      // Create a readable stream from the backup file
      const backupStream = fs.createReadStream(backupPath);

      // Set up automatic cleanup when the stream is closed
      backupStream.on("close", () => {
        this.cleanupBackup(backupPath);
      });

      backupStream.on("error", (error) => {
        log.error(`Stream error: ${error}`);
        this.cleanupBackup(backupPath);
      });

      log.info(`Backup stream created successfully for: ${backupPath}`);
      return backupStream;
    } catch (error) {
      log.error(`Failed to create backup: ${error}`);
      await this.cleanupBackup(backupPath);
      throw error;
    }
  }

  /**
   * Manually clean up a backup file. This is called automatically when the stream
   * is closed or garbage collected, but can be called manually for immediate cleanup.
   */
  private async cleanupBackup(backupPath: string) {
    const { log } = makeSubsystemReporters("db", "db.cleanupBackup");

    if (this.activeBackups.has(backupPath)) {
      try {
        if ((await fs.promises.stat(backupPath)).isFile()) {
          await fs.promises.unlink(backupPath);
          log.info(`Cleaned up backup file: ${backupPath}`);
        }
        this.activeBackups.delete(backupPath);
      } catch (error) {
        log.error(`Failed to cleanup backup file ${backupPath}: ${error}`);
      }
    }
  }

  get(key: DbKey): DbConnection<S> | undefined {
    return this.instances.get(key);
  }

  private closeSqliteDb(instance: DbConnection<S>): void {
    // NOTE: reaches into Drizzle's internal session shape (`instance.session.client`)
    // to call better-sqlite3's `close()`. This is a private API and may break on
    // a future Drizzle major; if the cast or method lookup fails we log and move
    // on (the handle leak only matters at process exit).
    let client: { close?: () => void } | undefined;
    try {
      client = (
        instance as unknown as {
          session?: { client?: { close?: () => void } };
        }
      ).session?.client;
    } catch {
      /* ignore */
    }
    if (!client || typeof client.close !== "function") {
      const { log } = makeSubsystemReporters("db", "db.closeSqliteDb");
      log.warn(
        "closeSqliteDb: could not locate underlying better-sqlite3 client " +
          "via instance.session.client — handle may leak. Drizzle internals " +
          "may have changed.",
      );
      return;
    }
    try {
      client.close();
    } catch {
      /* ignore close failures */
    }
  }

  /** SQLite path for the key, or `:memory:`, or `undefined` if unknown. */
  getDbPath = (key: DbKey): string | undefined => {
    return this.dbPaths.get(key);
  };

  /**
   * Deletes all application rows from every table in the connected database.
   * Preserves `__drizzle_migrations`. For query unit tests that reuse one
   * in-memory connection per file (`beforeAll` connect + `beforeEach` reset).
   */
  clearAllTablesForTests = (key: DbKey): void => {
    if (typedEnv.NODE_ENV !== "test") {
      throw new Error(
        "clearAllTablesForTests is only available when NODE_ENV=test",
      );
    }

    const instance = this.instances.get(key);
    if (!instance) {
      throw new Error("clearAllTablesForTests: database instance not found");
    }

    const client = (
      instance as unknown as {
        session: {
          client: {
            prepare: (sql: string) => {
              all: () => { name: string }[];
              run: () => unknown;
            };
            exec: (sql: string) => void;
            transaction: <T>(fn: () => T) => () => T;
          };
        };
      }
    ).session.client;

    const tables = client
      .prepare(
        `SELECT name FROM sqlite_master
         WHERE type = 'table'
           AND name NOT LIKE 'sqlite_%'
           AND name != '__drizzle_migrations'`,
      )
      .all();

    client.exec("PRAGMA foreign_keys = OFF");
    try {
      const clearTables = client.transaction(() => {
        for (const { name } of tables) {
          const escaped = name.replace(/"/g, '""');
          client.prepare(`DELETE FROM "${escaped}"`).run();
        }
      });
      clearTables();
    } finally {
      client.exec("PRAGMA foreign_keys = ON");
    }
  };

  /** Flush WAL pages into the main db file and reset the WAL (SQLite backup-safe). */
  walCheckpointTruncate = (key: DbKey): void => {
    const instance = this.instances.get(key);
    if (!instance) {
      throw new Error("walCheckpointTruncate: database instance not found");
    }
    const client = (
      instance as unknown as {
        session: { client: { pragma: (s: string) => unknown } };
      }
    ).session.client;
    client.pragma("wal_checkpoint(TRUNCATE)");
  };

  /**
   * Online SQLite backup of the database registered under `key` to `destinationPath`.
   * Uses better-sqlite3's `db.backup()` (SQLite Online Backup API), so the
   * source DB can stay open and writable during the copy.
   *
   * The destination file is overwritten if it exists. Parent directory must exist.
   */
  backupTo = async (key: DbKey, destinationPath: string): Promise<void> => {
    const instance = this.instances.get(key);
    if (!instance) {
      throw new Error("backupTo: database instance not found");
    }
    const client = (
      instance as unknown as {
        session: { client: { backup: (path: string) => Promise<unknown> } };
      }
    ).session.client;
    await client.backup(destinationPath);
  };

  /**
   * Open an on-disk SQLite file and register it under an existing {@link DbKey}
   * (after {@link disconnect} removed the prior connection). Used for audit seal
   * rotation so the process keeps the same key while replacing the file.
   */
  attachConnection = (
    key: DbKey,
    sqlitePath: string,
    options?: DbOptions,
  ): void => {
    if (this.instances.has(key)) {
      throw new Error("attachConnection: DbKey already has an open connection");
    }
    const { log } = makeSubsystemReporters("init", "db.attachConnection");
    log.info(`Attaching database at ${sqlitePath}`);
    const sqlite = options?.readonly
      ? new Database(sqlitePath, { readonly: true, fileMustExist: true })
      : new Database(sqlitePath);
    this.applyPragmas(sqlite, options?.pragmas);
    const db = drizzle(sqlite, { schema: this.schema });
    if (
      this.config.out &&
      !options?.readonly &&
      !options?.skipMigrations
    ) {
      this.runMigrations(sqlite, db, log);
    }
    this.instances.set(key, db);
    this.dbPaths.set(key, sqlitePath);
  };

  disconnect = (key: DbKey): boolean => {
    const instance = this.instances.get(key);
    if (instance) {
      this.closeSqliteDb(instance);
      this.instances.delete(key);
      this.dbPaths.delete(key);
      return true;
    }
    return false;
  };

  async restore(key: DbKey, stream: Readable): Promise<void> {
    const { log } = makeSubsystemReporters("init", "db.restore");
    const instance = this.instances.get(key);
    if (!instance) {
      throw new Error("Cannot restore: database instance not found");
    }

    const dbPath = this.dbPaths.get(key);
    if (!dbPath) {
      throw new Error("Cannot restore: database path not found");
    }

    if (dbPath === ":memory:") {
      throw new Error("Cannot restore: database is in-memory");
    }

    const tempPath = `${dbPath}.restore.${randomUUID()}`;
    log.info(`Restoring database from stream to temporary file: ${tempPath}`);

    const writeStream = fs.createWriteStream(tempPath);

    return new Promise((resolve, reject) => {
      stream.on("error", async (error) => {
        writeStream.destroy();
        try {
          await fs.promises.unlink(tempPath);
        } catch {}
        log.error(`Stream error during restore: ${error}`);
        reject(error);
      });

      writeStream.on("error", async (error) => {
        stream.destroy();
        try {
          await fs.promises.unlink(tempPath);
        } catch {}
        log.error(`Write error during restore: ${error}`);
        reject(error);
      });

      writeStream.on("finish", async () => {
        try {
          await fs.promises.rename(tempPath, dbPath);
          log.info(`Database restored successfully to: ${dbPath}`);
          resolve();
        } catch (error) {
          try {
            await fs.promises.unlink(tempPath);
          } catch {}
          log.error(`Failed to rename temporary file: ${error}`);
          reject(error);
        }
      });

      stream.pipe(writeStream);
    });
  }

  private applyPragmas = (
    sqlite: Database.Database,
    pragmas?: Record<string, string | number>,
  ): void => {
    const merged = { ...this.defaultPragmas, ...pragmas };
    for (const [key, value] of Object.entries(merged)) {
      sqlite.pragma(`${key} = ${value}`);
    }
  };

  publicInterface() {
    return {
      connect: this.connect,
      disconnect: this.disconnect,
      createBackup: this.createBackup.bind(this),
      restore: this.restore.bind(this),
      getDbPath: this.getDbPath,
      clearAllTablesForTests: this.clearAllTablesForTests,
      walCheckpointTruncate: this.walCheckpointTruncate,
      attachConnection: this.attachConnection,
      backupTo: this.backupTo.bind(this),
    };
  }
}
