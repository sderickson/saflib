import winston, { type Logger, format } from "winston";
import { type TransformableInfo } from "logform";
import { Writable } from "stream";

export const consoleTransport = new winston.transports.Console({
  silent: process.env.NODE_ENV === "test",
});

const baseLogger = winston.createLogger({
  transports: [consoleTransport],
  format: format.combine(
    format.colorize({ all: true }),
    format.timestamp(),
    format.printf(
      (info: TransformableInfo & { timestamp?: string; reqId?: string }) => {
        const { timestamp, level, message, reqId } = info;
        const reqIdStr = reqId ? `<${reqId}> ` : ""; // Keep reqId optional here for the base logger
        return `${timestamp} ${reqIdStr}[${level}]: ${message}`;
      },
    ),
  ),
});

let allStreamTransports: winston.transports.StreamTransportInstance[] = [];

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

export const removeAllSimpleStreamTransports = () => {
  allStreamTransports.forEach((transport) => {
    baseLogger.remove(transport);
  });
  allStreamTransports = [];
};

/**
 * Creates a child logger with the specified request ID.
 * @param reqId - The request ID to associate with log messages.
 * @returns A child Logger instance.
 */
export const createLogger = (reqId: string): Logger => {
  return baseLogger.child({ reqId });
};
