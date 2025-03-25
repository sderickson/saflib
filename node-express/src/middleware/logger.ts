import type { Handler } from "express";
import winston, { Logger } from "winston";
import "../types.ts";

/**
 * Creates a Winston logger instance with standard configuration.
 * Includes colorization, timestamps, and request ID correlation.
 */
export const createLogger = (): Logger => {
  return winston.createLogger({
    transports: [
      new winston.transports.Console({
        silent: process.env.NODE_ENV === "test",
      }),
    ],
    format: winston.format.combine(
      winston.format.colorize({ all: true }),
      winston.format.timestamp(),
      winston.format.printf(({ reqId, level, message, timestamp }) => {
        return `${timestamp} <${reqId}> [${level}]: ${message}`;
      }),
    ),
  });
};

// Create a default logger instance
const defaultLogger = createLogger();

/**
 * Middleware that attaches a child logger with request ID correlation to each request.
 * The logger is available at req.log.
 */
export const loggerInjector: Handler = (req, _res, next) => {
  req.log = defaultLogger.child({ reqId: (req as any).shortId });
  next();
};

// Export the default logger for direct use
export { defaultLogger as logger };
