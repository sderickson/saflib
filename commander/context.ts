import { AsyncLocalStorage } from "node:async_hooks";
import crypto from "node:crypto";
import winston, { format } from "winston";
import type { TransformableInfo } from "logform";

/**
 * CLI runtime context options.
 */
export interface SetupContextOptions {
  silentLogging?: boolean;
  serviceName: string;
}

export interface CliContext {
  requestId: string;
  serviceName: string;
  operationName: string;
  subsystemName: string;
}

export interface CliReporters {
  log: winston.Logger;
  logError: (error: Error, message?: string) => void;
}

const cliContextStorage = new AsyncLocalStorage<CliContext>();
const cliReportersStorage = new AsyncLocalStorage<CliReporters>();

const defaultCliReporters: CliReporters = {
  log: winston.createLogger({
    transports: [new winston.transports.Console({ silent: true })],
  }),
  logError: (error: Error, message?: string) => {
    console.error(message ?? error.message, error);
  },
};

/** Read the active CLI context. Throws outside `setupContext` unless `NODE_ENV=test`. */
export function getCliContext(): CliContext {
  const store = cliContextStorage.getStore();
  if (!store && process.env.NODE_ENV === "test") {
    return {
      requestId: "test-id",
      serviceName: "test",
      subsystemName: "cli",
      operationName: process.argv[2] ?? "test",
    };
  }
  if (!store) {
    throw new Error("CliContext not found");
  }
  return store;
}

/** Read the active CLI reporters. Falls back to silent defaults in tests. */
export function getCliReporters(): CliReporters {
  const store = cliReportersStorage.getStore();
  if (!store || process.env.NODE_ENV === "test") {
    return defaultCliReporters;
  }
  return store;
}

function generateRequestId(): string {
  const randomBytes = crypto.randomBytes(16);
  randomBytes[6] = (randomBytes[6]! & 0x0f) | 0x40;
  randomBytes[8] = (randomBytes[8]! & 0x3f) | 0x80;
  return [
    randomBytes.toString("hex", 0, 4),
    randomBytes.toString("hex", 4, 6),
    randomBytes.toString("hex", 6, 8),
    randomBytes.toString("hex", 8, 10),
    randomBytes.toString("hex", 10, 16),
  ].join("-");
}

function defaultErrorReporter(error: Error, message?: string) {
  console.error(message ?? error.message, error);
}

/**
 * Builds and runs CLI context and reporter storage for commander programs.
 */
export const setupContext = (
  options: SetupContextOptions,
  callback: () => void,
) => {
  const { silentLogging = false, serviceName } = options;
  const operationName = process.argv[2] ?? "help";
  const subsystemName = "cli";

  const ctx: CliContext = {
    requestId: generateRequestId(),
    serviceName,
    operationName,
    subsystemName,
  };

  const reporters: CliReporters = {
    log: silentLogging
      ? winston.createLogger({
          transports: [new winston.transports.Console({ silent: true })],
        })
      : winston.createLogger({
          transports: [new winston.transports.Console()],
          format: format.combine(
            format.colorize({ all: true }),
            format.printf((info: TransformableInfo) => `${info.message}`),
          ),
        }),
    logError: defaultErrorReporter,
  };

  cliReportersStorage.run(reporters, () => {
    cliContextStorage.run(ctx, callback);
  });
};
