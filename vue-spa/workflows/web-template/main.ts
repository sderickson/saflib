import { createVueApp } from "@saflib/vue-spa";
import App from "./TemplateApp.vue";
import { vuetifyConfig } from "@your-org/web-client-common";
import { router } from "./router";
import "vuetify/styles";

export const main = () => {
  createVueApp(App, { router, vuetifyConfig });
};
