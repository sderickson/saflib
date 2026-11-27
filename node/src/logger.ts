import winston, { type Logger, format } from "winston";
import { randomUUID } from "node:crypto";
import { type TransformableInfo } from "logform";
import { type SafContext } from "./types.ts";
import { getServiceName, testContext } from "./context.ts";
import { typedEnv } from "../env.ts";
import { formatCompactTimestamp } from "./logFormat.ts";
import {
  createDevLogBufferTransport,
  enableDevLogBuffer,
} from "@saflib/node-log-http";

type WinstonLogger = Logger;

const LEVEL_ORDER = [
  "error",
  "warn",
  "info",
  "http",
  "verbose",
  "debug",
  "silly",
] as const;

type LogLevel = (typeof LEVEL_ORDER)[number];

const consoleLevel = (typedEnv.LOG_LEVEL ?? "info") as LogLevel;
const isDevelopment = typedEnv.DEPLOYMENT_NAME === "development";

/**
 * In development, keep the logger at least at `info` so the in-memory buffer
 * captures startup/request logs while the console can stay quieter via LOG_LEVEL.
 */
function resolveLoggerLevel(): LogLevel {
  // The logger's level gates every transport, and each transport filters
  // again for itself (the console at LOG_LEVEL). Keep it at least `http` so
  // per-request lines reach the persistent store.
  const consoleIdx = LEVEL_ORDER.indexOf(consoleLevel);
  const httpIdx = LEVEL_ORDER.indexOf("http");
  return LEVEL_ORDER[Math.max(consoleIdx, httpIdx)] ?? "http";
}

const loggerLevel = resolveLoggerLevel();

const consoleTransport = new winston.transports.Console({
  silent: typedEnv.NODE_ENV === "test",
  level: consoleLevel,
});

const compactTimestamp = format((info) => {
  info.timestamp = formatCompactTimestamp();
  return info;
});

const baseLogger = winston.createLogger({
  level: loggerLevel,
  transports: [consoleTransport],
  format: format.combine(
    compactTimestamp(),
    format.printf(
      (info: TransformableInfo & {
        timestamp?: string;
        request_id?: string;
      }) => {
        const { timestamp, level, message, request_id } = info;
        const reqIdStr =
          request_id && request_id !== "-"
            ? `<${request_id.slice(0, 8)}> `
            : "";
        return `${timestamp} ${reqIdStr}[${level}]: ${message}`;
      },
    ),
  ),
});

if (isDevelopment) {
  enableDevLogBuffer({ capacity: 1000 });
  baseLogger.add(createDevLogBufferTransport());
}

/**
 * For production, when the application starts, it should add any transports using this function. Then all SAF-based applications will log to winston and they'll propagate to loggers such as Loki.
 */
export const addTransport = (transport: winston.transport) => {
  baseLogger.add(transport);
};

/**
 * Context to give for a logger, which doesn't include properties that are global.
 */
export type LoggerContext = Omit<SafContext, "serviceName">;
export interface LoggerOptions extends LoggerContext {
  format?: winston.Logform.Format;
}

/** Identifies this process's startup and shutdown lines. */
const PROCESS_ID = `p-${randomUUID().slice(0, 8)}`;

/**
 * What a log line belongs to, for grouping in the logs UI: the job delivery,
 * cron tick, process startup or request it was logged during.
 */
export function logContextOf(
  options: Pick<LoggerContext, "subsystemName" | "requestId" | "jobId">,
): { context_kind: string; context_id: string } | undefined {
  if (options.jobId) return { context_kind: "job", context_id: options.jobId };
  if (options.subsystemName === "cron" && options.requestId) {
    return { context_kind: "cron", context_id: options.requestId };
  }
  if (options.subsystemName === "init") {
    return { context_kind: "process", context_id: PROCESS_ID };
  }
  if (options.requestId) return { context_kind: "request", context_id: options.requestId };
  return undefined;
}

/**
 * Creates a child logger with the specified request ID. Any servers or processors
 * should use this to create a unique logger for each request or job or what have you.
 * However, if not "instantiating" the request, you should use the request ID provided
 * by the caller, such as in the proto envelope, so that requests which span processes
 * can be correlated.
 */
export const createLogger = (options?: LoggerOptions): WinstonLogger => {
  if (!options) {
    return baseLogger.child(testContext);
  }
  /*
   * I think I need to nail down my infra terminology here
   *
   * Host - A physical machine running some set of services.
   * Service - A cohesive backend for a domain. Auth, Product, AI, Payment, Logging.
   *   | Includes everything from the db layer up to the API layer.
   * Subsystem - A distinct long-running server or thread. HTTP, GRPC, Cron, Jobs.
   *
   * A service may run all its subsystems on one single host, or spread them across
   * a number of hosts, with different hosts running different subsystems.
   * Each service has a single image, which runs subsystems based on env variables.
   */
  const serviceName = getServiceName();
  const snakeCaseOptions = {
    service_name: serviceName,
    subsystem_name: serviceName + "." + options.subsystemName,
    operation_name: options.operationName,
    request_id: options.requestId || "-",
    user_id: options.auth?.userId || "-",
    ...logContextOf(options),
  };
  if (options.format) {
    return winston.createLogger({
      level: loggerLevel,
      transports: [consoleTransport],
      format: options.format,
    });
  }
  return baseLogger.child(snakeCaseOptions);
};

/**
 * Create a logger that doesn't print anything.
 */
export const createSilentLogger = (): WinstonLogger => {
  return winston.createLogger({
    transports: [new winston.transports.Console({ silent: true })],
  });
};
