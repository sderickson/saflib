import { createVueApp, configureAppDocumentTitle } from "@saflib/vue";
import { setClientName } from "@saflib/links";
import { vuetifyConfig } from "./vuetify-config.ts";
import Spa from "./App.vue";
import "vuetify/styles";
import { createDevSiteRouter } from "./router.ts";

export const main = () => {
  setClientName("dev-site");
  configureAppDocumentTitle("Dev Site");
  const router = createDevSiteRouter();
  createVueApp(Spa, { router, vuetifyConfig });
};

main();
