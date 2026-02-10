import { getSafContext, getServiceName, safContextStorage } from "./context.ts";
import { getSafReporters } from "./reporters.ts";
import type {
  ErrorCollector,
  ErrorCollectorParam,
  ErrorReporter,
  ErrorReportOptions,
  SafContext,
} from "./types.ts";
import { typedEnv } from "@saflib/env";

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
  let ctx: SafContext = {
    serviceName: "unknown",
    subsystemName: "init",
    operationName: "unknown",
    requestId: "unknown",
    auth: undefined,
  };
  try {
    ctx = getSafContext();
  } catch {
    // ignore
  }

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
  broadcastError(e, collectorParam, options);
};

const broadcastError = (
  e: Error,
  collectorParam: ErrorCollectorParam,
  options?: ErrorReportOptions,
) => {
  const { log } = getSafReporters();
  getErrorCollectors().forEach((collector) => collector(collectorParam));

  const winstonLevel =
    collectorParam.level === "warning" ? "warn" : collectorParam.level;

  // Logger already has SAF context incorporated.
  log.log(winstonLevel, e.message, {
    ...options?.extra,
  });

  // Errors and fatals should always be fixed. If they show up in logs,
  // during tests, output them so they (hopefully) get addressed.
  if (
    (winstonLevel === "error" || winstonLevel === "fatal") &&
    // If we're in test mode and error collectors are registered, assume the
    // test is asserting whether or not errors are being logged and silence to manage noise.
    // If there are no error collectors, log to console for easier debugging.
    !(typedEnv.NODE_ENV === "test" && getErrorCollectors().length > 0)
  ) {
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

    broadcastError(e, collectorParam, options);
  };
};
