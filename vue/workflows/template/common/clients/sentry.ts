import * as Sentry from "@sentry/vue";
import { createApp } from "vue";
export const sentryCallback = function (app: ReturnType<typeof createApp>) {
  if (document.location.hostname.includes("localhost")) {
    console.log("Sentry disabled for localhost");
    return;
  }
  if (!import.meta.env.VITE_CLIENT_SENTRY_DSN) {
    console.log("Sentry disabled for missing VITE_CLIENT_SENTRY_DSN");
    return;
  }
  Sentry.init({
    app,
    dsn: import.meta.env.VITE_CLIENT_SENTRY_DSN,
    sendDefaultPii: true,
  });
};
