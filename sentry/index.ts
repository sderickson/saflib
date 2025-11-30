import * as Sentry from "@sentry/node";
import { addErrorCollector } from "@saflib/node";
import { typedEnv } from "./env.ts";

export const initSentry = () => {
  if (typedEnv.MOCK_INTEGRATIONS === "true" && !typedEnv.SENTRY_DSN) {
    return;
  }

  if (!typedEnv.SENTRY_DSN) {
    throw new Error("SENTRY_DSN is not set");
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
