import * as Sentry from "@sentry/node";
import { addErrorCollector } from "@saflib/node";
import { typedEnv } from "./env.ts";
import { getSafReporters } from "@saflib/node";

export const initSentry = () => {
  const { log } = getSafReporters();
  if (typedEnv.SENTRY_DSN === "mock" || !typedEnv.SENTRY_DSN) {
    return;
  }

  Sentry.init({
    dsn: typedEnv.SENTRY_DSN,
    sendDefaultPii: true,
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
