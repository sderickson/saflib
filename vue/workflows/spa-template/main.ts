import { createVueApp, setClientName } from "@saflib/vue";
import App from "./TemplateFileApp.vue";
import { router } from "./router.ts";

export const main = () => {
  setClientName("web-my-app");
  createVueApp(App, { router });
};
