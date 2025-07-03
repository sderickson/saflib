import { getSafContext } from "./context";
import { getSafReporters } from "./reporters.ts";
import type {
  ErrorCollector,
  ErrorCollectorParam,
  ErrorReporter,
} from "./types.ts";

const errorCollectors: ErrorCollector[] = [];

export const addErrorCollector = (collector: ErrorCollector) => {
  errorCollectors.push(collector);
};

export const getErrorCollectors = () => {
  return errorCollectors.slice();
};

/**
 * Default behavior when an exception is reported:
 * - Add tags based on SafContext
 * - Set default level to error
 * - Ensure the "error" is an Error
 * - Send to dedicated error collectors, and also log to the logger
 */
export const defaultErrorReporter: ErrorReporter = (error, options) => {
  const e =
    error instanceof Error ? error : new Error("Thrown error was not an Error");
  const ctx = getSafContext();
  const { log } = getSafReporters();

  const collectorUser: ErrorCollectorParam["user"] | undefined = ctx.auth
    ? {
        id: ctx.auth.userId,
      }
    : undefined;

  const collectorParam: ErrorCollectorParam = {
    error: e,
    user: collectorUser,
    level: options?.level || "error",
    extra: options?.extra || {},
    tags: {
      "service.name": ctx.serviceName,
      "operation.name": ctx.operationName,
      "request.id": ctx.requestId,
    },
  };

  getErrorCollectors().forEach((collector) => collector(collectorParam));

  // Logger already has SAF context incorporated.
  log.log(collectorParam.level, e.message, {
    stack: e.stack,
    ...options?.extra,
  });
};
