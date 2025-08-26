import { createVueApp } from "@saflib/vue";
import App from "./TemplateApp.vue";
import { router } from "./router";

export const main = () => {
  createVueApp(App, { router });
};
