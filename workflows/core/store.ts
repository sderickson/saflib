import { AsyncLocalStorage } from "async_hooks";
import path from "node:path";

/**
 * Logger interface for workflow operations
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
}

/**
 * Create a simple console-based logger with the specified options
 */
export function createWorkflowLogger(
  options: WorkflowLoggerOptions = {},
): WorkflowLogger {
  const { silent = false } = options;

  if (silent) {
    return createSilentLogger();
  }

  return {
    info: (message: string) => console.log(`[✓] ${message}`),
    error: (message: string) => console.error(`[✗] ${message}`),
    warn: (message: string) => console.warn(`[⚠] ${message}`),
    debug: (message: string) => console.debug(`[.] ${message}`),
  };
}

/**
 * Create a silent logger that doesn't output anything
 */
export function createSilentLogger(): WorkflowLogger {
  return {
    info: () => {},
    error: () => {},
    warn: () => {},
    debug: () => {},
  };
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
