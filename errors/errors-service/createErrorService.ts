import type { ErrorService } from "./types.ts";
import { InMemoryErrorService } from "./in-memory/InMemoryErrorService.ts";

export type CreateErrorServiceOptions = { type: "in-memory" };

/**
 * Creates an in-memory error service backed by a ring buffer.
 * For Sentry, use `@saflib/vendors-sentry-node`.
 */
export function createErrorService(
  _options: CreateErrorServiceOptions = { type: "in-memory" },
): ErrorService {
  return new InMemoryErrorService();
}
