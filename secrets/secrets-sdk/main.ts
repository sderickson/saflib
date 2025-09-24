import App from "./App.vue";
import { createVueApp, setClientName } from "@saflib/vue";

export const main = () => {
  setClientName("root");
  createVueApp(App);
};

main();
