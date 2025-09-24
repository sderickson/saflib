import { createVueApp, setClientName } from "@saflib/vue";
import App from "./__TargetName__App.vue";
import { router } from "./router.ts";

export const main = () => {
  setClientName("__target_name__");
  createVueApp(App, { router });
};
