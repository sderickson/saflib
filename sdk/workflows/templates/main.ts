import App from "./App.vue";
import { createVueApp, setClientName } from "@saflib/vue";
import "@saflib/vue/components";
import { __serviceName__SdkStrings } from "./strings";
import { setupWorker } from "msw/browser";
import { __serviceName__ServiceFakeHandlers } from "./fakes.ts";
import { http, bypass } from "msw";
import { router } from "./router.ts";

export const main = async () => {
  setClientName("root");
  const server = setupWorker(
    ...__serviceName__ServiceFakeHandlers,
    http.get("*", ({ request }) => {
      const originalUrl = new URL(request.url);
      const proxyRequest = new Request(originalUrl, {
        headers: request.headers,
      });
      return fetch(bypass(proxyRequest));
    }),
  );
  await server.start({ onUnhandledRequest: "error" });
  createVueApp(App, {
    i18nMessages: {
      ...__serviceName__SdkStrings,
    },
    router,
  });
};

main();
