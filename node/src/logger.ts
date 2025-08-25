import winston, { type Logger, format } from "winston";
import { type TransformableInfo } from "logform";
import { type SafContext } from "./types.ts";
import { getServiceName, testContext } from "./context.ts";
import { typedEnv } from "@saflib/env";

type WinstonLogger = Logger;

const consoleTransport = new winston.transports.Console({
  silent: typedEnv.NODE_ENV === "test",
});

const baseLogger = winston.createLogger({
  transports: [consoleTransport],
  format: format.combine(
    format.timestamp(),
    format.json(),
    format.printf(
      (info: TransformableInfo & { timestamp?: string; reqId?: string }) => {
        const { timestamp, level, message, reqId } = info;
        const reqIdStr = reqId ? `<${reqId.slice(0, 8)}> ` : ""; // Keep reqId optional here for the base logger
        return `${timestamp} ${reqIdStr}[${level}]: ${message}`;
      },
    ),
  ),
});

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

/**
 * Creates a child logger with the specified request ID. Any servers or processors
 * should use this to create a unique logger for each request or job or what have you.
 * However, if not "instantiating" the request, you should use the request ID provided
 * by the caller, such as in the proto envelope, so that requests which span processes
 * can be correlated.
 */
export const createLogger = (options?: LoggerOptions): WinstonLogger => {
  if (!options && typedEnv.NODE_ENV === "test") {
    return baseLogger.child(testContext);
  }
  if (!options) {
    throw new Error("SAF Context is required outside of unit tests");
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
  };
  if (options.format) {
    return winston.createLogger({
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
