import type { Logger } from "winston";
import { getSafContext, getServiceName, safContextStorage } from "./context.ts";
import { getSafReporters } from "./reporters.ts";
import type {
  ErrorCollector,
  ErrorCollectorParam,
  ErrorReporter,
} from "./types.ts";

const errorCollectors: ErrorCollector[] = [];

/**
 * Adds a callback for when errors are reported by the application.
 */
export const addErrorCollector = (collector: ErrorCollector) => {
  errorCollectors.push(collector);
};

const getErrorCollectors = () => {
  return errorCollectors.slice();
};

/**
 * Default ErrorReporter; call addErrorCollector with this to use it.
 *
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
        id: ctx.auth.userId.toString() || "",
      }
    : undefined;

  const collectorParam: ErrorCollectorParam = {
    error: e,
    user: collectorUser,
    level: options?.level || "error",
    extra: options?.extra || {},
    tags: {
      "service.name": ctx.serviceName,
      "subsystem.name": ctx.subsystemName,
      "operation.name": ctx.operationName,
      "request.id": ctx.requestId || "-",
      "user.id": ctx.auth?.userId?.toString() || "-",
    },
  };

  getErrorCollectors().forEach((collector) => collector(collectorParam));

  const winstonLevel =
    collectorParam.level === "warning" ? "warn" : collectorParam.level;

  // Logger already has SAF context incorporated.
  log.log(winstonLevel, e.message, {
    ...options?.extra,
  });

  // Errors and fatals should always be fixed. If they show up in logs,
  // during tests, output them so they (hopefully) get addressed.
  if (winstonLevel === "error" || winstonLevel === "fatal") {
    console.error(e.stack);
  }
};

/**
 * During setup, subsystems should use this to create their own
 * set of reporters. "Operation name" should be the name of the
 * function.
 */
export const makeSubsystemErrorReporter = (
  subsystemName: string,
  operationName: string,
  logger: Logger,
): ErrorReporter => {
  return (error, options) => {
    let e: Error;

    const store = safContextStorage.getStore();
    if (store) {
      e = new Error("Used service error reporter in a non-service context");
    } else if (!(error instanceof Error)) {
      e = new Error("Thrown error was not an Error");
    } else {
      e = error;
    }
    const collectorParam: ErrorCollectorParam = {
      error: e,
      level: options?.level || "error",
      extra: options?.extra || {},
      tags: {
        "service.name": getServiceName(),
        "subsystem.name": subsystemName,
        "operation.name": operationName,
      },
    };

    getErrorCollectors().forEach((collector) => collector(collectorParam));

    const winstonLevel =
      collectorParam.level === "warning" ? "warn" : collectorParam.level;

    logger.log(winstonLevel, e.message, {
      ...options?.extra,
    });
  };
};
