import winston, { type Logger, format } from "winston";
import { type TransformableInfo } from "logform";
import { AsyncLocalStorage } from "async_hooks";
import path from "node:path";

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
 * Function type for getting source URLs from absolute file paths
 */
export type GetSourceUrlFunction = (absolutePath: string) => string;

/**
 * Context object that provides workflow utilities
 */
export interface WorkflowContext {
  logger: WorkflowLogger;
  getSourceUrl?: GetSourceUrlFunction;
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
 * AsyncLocalStorage for workflow context
 */
export const workflowContextStorage = new AsyncLocalStorage<WorkflowContext>();

/**
 * Get the current workflow context from async storage
 */
export function getWorkflowContext(): WorkflowContext {
  const context = workflowContextStorage.getStore();
  if (!context) {
    // Fallback to a context with silent logger if no context is set
    return {
      logger: createSilentLogger(),
    };
  }
  return context;
}

/**
 * Get the current workflow logger from async storage
 */
export function getWorkflowLogger(): WorkflowLogger {
  return getWorkflowContext().logger;
}

/**
 * Get source URL for a file path, with fallback to basename
 */
export function getSourceUrl(absolutePath: string): string {
  const context = getWorkflowContext();
  if (context.getSourceUrl) {
    return context.getSourceUrl(absolutePath);
  }
  // Fallback to just the basename if no getSourceUrl function is provided
  return path.basename(absolutePath);
}

/**
 * Set up the workflow context in async storage
 */
export function setupWorkflowContext(context: WorkflowContext): void {
  workflowContextStorage.enterWith(context);
}

/**
 * Set up the workflow logger in async storage (backward compatibility)
 */
export function setupWorkflowLogger(logger: WorkflowLogger): void {
  setupWorkflowContext({ logger });
}
