import { createVueApp, setClientName } from "@saflib/vue";
import App from "./__ServiceName__App.vue";
import { router } from "./router.ts";
import { __service_name___strings } from "./strings.ts";

export const main = () => {
  setClientName("__service_name__");
  createVueApp(App, {
    router,
    i18nMessages: {
      ...__service_name___strings,
    },
  });
};
