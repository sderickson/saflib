import * as Sentry from "@sentry/node";
import { addErrorCollector } from "@saflib/node";
import { typedEnv } from "./env.ts";

export const initSentry = () => {
  if (
    typedEnv.MOCK_INTEGRATIONS === "true" ||
    typedEnv.SENTRY_DSN === "mock" ||
    !typedEnv.SENTRY_DSN
  ) {
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
};
