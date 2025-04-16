import winston, { type Logger, format } from "winston";
import { type TransformableInfo } from "logform";

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

/**
 * Creates a child logger with the specified request ID.
 * @param reqId - The request ID to associate with log messages.
 * @returns A child Logger instance.
 */
export const createLogger = (reqId: string): Logger => {
  return baseLogger.child({ reqId });
};
