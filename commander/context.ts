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

/**
 * Name.
 */
export interface SetupContextOptions {
  silentLogging?: boolean;
  serviceName: string;
}

/**
 * Builds and runs the `@saflib/node` context and reporter storage for your CLI commands.
 *
 * To use, wrap this function around your `parse` call like this:
 *
 * ```ts
 * import { Command } from "commander";
 * const program = new Command()
 *   .name("my-cli-tool")
 *   .description("My CLI tool");
 *
 * // ... rest of commander setup
 *
 * setupContext({ serviceName: "my-cli-tool" }, () => {
 *   program.parse(process.argv);
 * });
 * ```
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
