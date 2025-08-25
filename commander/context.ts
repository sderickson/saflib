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

import type { SubsystemName } from "@saflib/node";

export interface SetupContextOptions {
  silentLogging?: boolean;
  serviceName?: string;
  operationName?: string;
  subsystemName?: SubsystemName;
}

export const setupContext = (options: SetupContextOptions = {}) => {
  const {
    silentLogging = false,
    serviceName = "cli",
    operationName = process.argv[2],
    subsystemName = "cli" as SubsystemName,
  } = options;

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

  safReportersStorage.enterWith(reporters);
  safContextStorage.enterWith(ctx);
};
