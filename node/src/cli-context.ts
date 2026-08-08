import type { SafContext, SafReporters } from "./types.ts";
import {
  generateRequestId,
  safContextStorage,
  setServiceName,
} from "./context.ts";
import {
  safReportersStorage,
} from "./reporters.ts";
import {
  createLogger,
  createSilentLogger,
} from "./logger.ts";
import { defaultErrorReporter } from "./errors.ts";
import { format } from "winston";
import { type TransformableInfo } from "logform";

/**
 * Name.
 */
export interface SetupContextOptions {
  silentLogging?: boolean;
  serviceName: string;
}

/**
 * Builds and runs the `@saflib/node` context and reporter storage for your CLI commands.
 */
export const setupContext = (
  options: SetupContextOptions,
  callback: () => void,
) => {
  const { silentLogging = false, serviceName } = options;

  const operationName = process.argv[2];
  const subsystemName = "cli";

  setServiceName(serviceName);

  const reqId = generateRequestId();

  const ctx: SafContext = {
    requestId: reqId,
    serviceName,
    operationName,
    subsystemName,
  };

  const reporters: SafReporters = {
    log: silentLogging
      ? createSilentLogger()
      : createLogger({
          ...ctx,
          format: format.combine(
            format.colorize({ all: true }),
            format.printf((info: TransformableInfo) => {
              const { message } = info;
              return `${message}`;
            }),
          ),
        }),
    logError: defaultErrorReporter,
  };

  safReportersStorage.run(reporters, () => {
    safContextStorage.run(ctx, callback);
  });
};
