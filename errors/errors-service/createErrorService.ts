import type { DbKey } from "@saflib/drizzle";
import type { ErrorService } from "./types.ts";
import { InMemoryErrorService } from "./in-memory/InMemoryErrorService.ts";
import { SqliteErrorService } from "./sqlite/SqliteErrorService.ts";

export type CreateErrorServiceOptions =
  | { type: "in-memory" }
  | { type: "sqlite"; getDbKey: () => DbKey };

/**
 * In-memory (ring buffer; development and tests) or SQLite (persistent
 * grouped issues via `@saflib/errors-db`). For Sentry, use
 * `@saflib/vendors-sentry-node`.
 */
export function createErrorService(
  options: CreateErrorServiceOptions = { type: "in-memory" },
): ErrorService {
  if (options.type === "sqlite") {
    return new SqliteErrorService({ getDbKey: options.getDbKey });
  }
  return new InMemoryErrorService();
}
