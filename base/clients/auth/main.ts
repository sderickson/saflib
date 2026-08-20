import { configureAppDocumentTitle, createVueApp } from "@saflib/vue";
import { setClientName } from "@saflib/links";
import Spa from "./AuthSpa.vue";
import "vuetify/styles";
import { createAuthRouter } from "./router.ts";
import { auth_strings } from "./strings.ts";

export const main = () => {
  setClientName("auth");
  configureAppDocumentTitle("Base Auth");
  const router = createAuthRouter();
  createVueApp(Spa, {
    router,
    i18nMessages: {
      ...auth_strings,
    },
  });
};
