import { configureAppDocumentTitle, createVueApp } from "@saflib/vue";
import { setClientName } from "@saflib/links";
import Spa from "./AppSpa.vue";
import "vuetify/styles";
import { createAppRouter } from "./router.ts";
import { app_strings } from "./strings.ts";

export const main = () => {
  setClientName("app");
  configureAppDocumentTitle("Templates App");
  const router = createAppRouter();
  createVueApp(Spa, {
    router,
    i18nMessages: {
      ...app_strings,
    },
  });
};
