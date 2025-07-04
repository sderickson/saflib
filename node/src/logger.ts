import winston, { type Logger, format } from "winston";
import { type TransformableInfo } from "logform";
import { Writable } from "node:stream";
import { type SafContext } from "./types.ts";
import { testContext } from "./context.ts";

export const consoleTransport = new winston.transports.Console({
  silent: process.env.NODE_ENV === "test",
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
 * For production, when the application starts, it should add any transports using this function.
 * Then all SAF-based applications will log to winston and they'll propagate.
 */
export const addTransport = (transport: winston.transport) => {
  baseLogger.add(transport);
};

/**
 * Adds a simple stream transport to the base logger.
 * This is mainly used for testing; e.g. pass in a vi.fn().
 * Call `removeAllSimpleStreamTransports()` when done to clean up.
 * @param fn - A function that takes a log message and returns a boolean.
 */
export const addSimpleStreamTransport = (fn: (message: string) => boolean) => {
  const memoryStream = new Writable({
    write: (chunk, _, callback) => {
      const logObject = chunk.toString();
      fn(logObject);
      callback();
    },
  });

  const transport = new winston.transports.Stream({
    stream: memoryStream,
  } as winston.transports.StreamTransportOptions);
  allStreamTransports.push(transport);
  baseLogger.add(transport);
};

/**
 * Call this at the end of a test that uses addSimpleStreamTransport.
 */
export const removeAllSimpleStreamTransports = () => {
  allStreamTransports.forEach((transport) => {
    baseLogger.remove(transport);
  });
  allStreamTransports = [];
};

let allStreamTransports: winston.transports.StreamTransportInstance[] = [];

/**
 * Creates a child logger with the specified request ID. Any servers or processors
 * should use this to create a unique logger for each request or job or what have you.
 * However, if not "instantiating" the request, you should use the request ID provided
 * by the caller, such as in the proto envelope, so that requests which span processes
 * can be correlated.
 */
export const createLogger = (options?: SafContext): Logger => {
  if (!options && process.env.NODE_ENV === "test") {
    return baseLogger.child(testContext);
  }
  if (!options) {
    throw new Error("SAF Context is required outside of unit tests");
  }
  const snakeCaseOptions = {
    service_name: options.serviceName,
    operation_name: options.operationName,
    request_id: options.requestId,
  };
  return baseLogger.child(snakeCaseOptions);
};

/**
 * Service loggers should only be used for service-level events, such as service startup.
 */
export const createServiceLogger = (serviceName: string): Logger => {
  return baseLogger.child({
    service_name: serviceName,
    operation_name: "(none)",
    request_id: "(none)",
  });
};
