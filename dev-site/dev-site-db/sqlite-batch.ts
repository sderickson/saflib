/**
 * SQLite caps bound parameters per statement (`SQLITE_MAX_VARIABLE_NUMBER`).
 * Better-sqlite3 is often compiled with 32766, but stay under the common 999
 * default so inserts stay portable.
 */
export const SQLITE_SAFE_MAX_VARS = 900;

/** Max rows per INSERT given how many columns each row binds. */
export function insertBatchSize(columnCount: number): number {
  if (columnCount < 1) {
    throw new Error("columnCount must be >= 1");
  }
  return Math.max(1, Math.floor(SQLITE_SAFE_MAX_VARS / columnCount));
}

export function chunkArray<T>(items: readonly T[], size: number): T[][] {
  if (size < 1) {
    throw new Error("chunk size must be >= 1");
  }
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}
