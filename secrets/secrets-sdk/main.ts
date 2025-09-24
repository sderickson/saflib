import App from "./App.vue";
import { createVueApp, setClientName } from "@saflib/vue";
import "@saflib/vue/components";
import { secretsSdkStrings } from "./strings";
import { setupWorker } from "msw/browser";
import { secretsServiceFakeHandlers } from "./fakes.ts";

export const main = () => {
  const server = setupWorker(...secretsServiceFakeHandlers);
  server.start({ onUnhandledRequest: "error" });
  setClientName("root");
  createVueApp(App, {
    i18nMessages: {
      ...secretsSdkStrings,
    },
  });
};

main();
