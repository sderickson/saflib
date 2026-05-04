import * as Sentry from "@sentry/node";
import { addErrorCollector } from "@saflib/node";
import { typedEnv } from "./env.ts";
import { getSafReporters } from "@saflib/node";

export type InitSentryOptions = {
  sendDefaultPii?: boolean;
};

export const initSentry = (options: InitSentryOptions = {}) => {
  const { log } = getSafReporters();
  if (typedEnv.SENTRY_DSN === "mock" || !typedEnv.SENTRY_DSN) {
    return;
  }

  const sendDefaultPii = options.sendDefaultPii ?? false;

  Sentry.init({
    dsn: typedEnv.SENTRY_DSN,
    sendDefaultPii,
  });

  addErrorCollector(({ error, level, extra, tags, user }) => {
    Sentry.captureException(error, {
      level,
      extra,
      tags,
      user,
    });
  });

  log.info(
    `Sentry initialized with DSN: ${typedEnv.SENTRY_DSN.slice(0, 16) + "..."}`,
  );
};
