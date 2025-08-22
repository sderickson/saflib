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

interface SetupContextOptions {
  silentLogging?: boolean;
}

export const setupContext = (options: SetupContextOptions) => {
  setServiceName("workflows");

  const reqId = generateRequestId();

  const ctx: SafContext = {
    requestId: reqId,
    serviceName: "workflows",
    operationName: "N/A",
    subsystemName: "cli",
  };

  const reporters: SafReporters = {
    log: options.silentLogging
      ? createSilentLogger()
      : createLogger({
          subsystemName: "cli",
          operationName: "workflow-cli",
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

  safReportersStorage.enterWith(reporters);
  safContextStorage.enterWith(ctx);
};
