import { createVueApp } from "@saflib/vue-spa";
import App from "./TemplateApp.vue";
import { router } from "./router";

export const main = () => {
  createVueApp(App, { router });
};
