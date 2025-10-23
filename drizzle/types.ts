import { drizzle } from "drizzle-orm/better-sqlite3";

/**
 * Currently this package expects the schema to be an object where some values
 * are the result of `sqliteTable` calls. Organize your schema in this fashion
 * when creating your DbManager and such.
 */
export type Schema = Record<string, unknown>;

/**
 * A symbol returned when connecting to the database. This key should be provided
 * to any queries used by the consumer of the package. This is the only way a
 * database consumer may interact with the database.
 */
export type DbKey = symbol;

/**
 * When a "connection" is created, these parameters are provided.
 */
export interface DbOptions {
  /**
   * By default, the database will be created in memory. If onDisk is true, the
   * database will be created on disk, in a "data" folder, with the name of the
   * current environment. If onDisk is a string, the database will be created at
   * the given (absolute) path.
   */
  onDisk?: boolean | string;

  /**
   * During tests, onDisk is ignored and the database will be created in memory.
   * If you need to override this behavior, set this to true.
   */
  overrideTestDefault?: boolean;
}

/**
 * The result of calling `drizzle`, typed to the schema you connected to.
 */
export type DbConnection<S extends Schema> = ReturnType<typeof drizzle<S>>;

/**
 * Convenience type; the first parameter of the `transaction` method, with a
 * generic parameter for the schema.
 */
export type TransactionCallback<S extends Schema> = Parameters<
  DbConnection<S>["transaction"]
>[0];

/**
 * Convenience type; the `tx` object passed to the drizzle transaction callback,
 * with a generic parameter for the schema.
 */
export type DbTransaction<S extends Schema> = Parameters<
  TransactionCallback<S>
>[0];

/**
 * To be used with "Equal" to check explicit table interfaces match Drizzle's inferred interfaces.
 */
export type Expect<T extends true> = T;

/**
 * To be used with "Expect" to check explicit table interfaces match Drizzle's inferred interfaces.
 */
export type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
    ? true
    : false;
