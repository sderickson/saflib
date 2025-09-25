import { createVueApp, setClientName } from "@saflib/vue";
import App from "./__ServiceName__App.vue";
import { router } from "./router.ts";

export const main = () => {
  setClientName("__service_name__");
  createVueApp(App, { router });
};
