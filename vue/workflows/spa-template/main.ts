import { createVueApp } from "../../src";
import App from "./TemplateApp.vue";
import { router } from "./router";

export const main = () => {
  createVueApp(App, { router });
};
