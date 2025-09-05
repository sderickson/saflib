import winston, { type Logger, format } from "winston";
import { type TransformableInfo } from "logform";
import { AsyncLocalStorage } from "async_hooks";

/**
 * Logger interface that matches the winston Logger interface
 */
export interface WorkflowLogger {
  info: (message: string) => void;
  error: (message: string) => void;
  warn: (message: string) => void;
  debug: (message: string) => void;
}

/**
 * Options for creating a workflow logger
 */
export interface WorkflowLoggerOptions {
  silent?: boolean;
  format?: winston.Logform.Format;
}

/**
 * Create a winston logger with the specified options
 */
export function createWorkflowLogger(
  options: WorkflowLoggerOptions = {},
): Logger {
  const { silent = false, format: customFormat } = options;

  const consoleTransport = new winston.transports.Console({
    silent,
  });

  const defaultFormat = format.combine(
    format.timestamp(),
    format.json(),
    format.printf((info: TransformableInfo & { timestamp?: string }) => {
      const { message } = info;
      return `${message}`;
    }),
  );

  return winston.createLogger({
    transports: [consoleTransport],
    format: customFormat || defaultFormat,
  });
}

/**
 * Create a silent logger that doesn't output anything
 */
export function createSilentLogger(): Logger {
  return winston.createLogger({
    transports: [new winston.transports.Console({ silent: true })],
  });
}

/**
 * AsyncLocalStorage for workflow loggers
 */
export const workflowLoggerStorage = new AsyncLocalStorage<WorkflowLogger>();

/**
 * Get the current workflow logger from async storage
 */
export function getWorkflowLogger(): WorkflowLogger {
  const logger = workflowLoggerStorage.getStore();
  if (!logger) {
    // Fallback to a silent logger if no logger is set
    return createSilentLogger();
  }
  return logger;
}

/**
 * Set up the workflow logger in async storage
 */
export function setupWorkflowLogger(logger: WorkflowLogger): void {
  workflowLoggerStorage.enterWith(logger);
}
