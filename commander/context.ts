import type { SafContext, SafReporters } from "@saflib/node";
import {
  generateRequestId,
  safContextStorage,
  safReportersStorage,
  defaultErrorReporter,
  createLogger,
  setServiceName,
  createSilentLogger,
} from "@saflib/node";
import { format } from "winston";
import { type TransformableInfo } from "logform";

export interface SetupContextOptions {
  silentLogging?: boolean;
  serviceName: string;
}

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
