import { drizzle } from "drizzle-orm/better-sqlite3";

// Right now, just support a single file which exports all the schemas.
export type Schema = Record<string, unknown>;

export type DbKey = symbol;

export interface DbOptions {
  onDisk?: boolean | string;
  doNotCreate?: boolean;
}

export type DbConnection<S extends Schema> = ReturnType<typeof drizzle<S>>;
type TransactionCallback<S extends Schema> = Parameters<
  DbConnection<S>["transaction"]
>[0];
export type DbTransaction<S extends Schema> = Parameters<
  TransactionCallback<S>
>[0];
