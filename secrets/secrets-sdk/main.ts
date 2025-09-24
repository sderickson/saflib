import App from "./App.vue";
import { createVueApp, setClientName } from "@saflib/vue";
import "@saflib/vue/components";

export const main = () => {
  setClientName("root");
  createVueApp(App);
};

main();
