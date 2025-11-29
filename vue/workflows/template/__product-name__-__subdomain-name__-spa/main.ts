import { createVueApp } from "@saflib/vue";
import { setClientName } from "@saflib/links";
import App from "./__SubdomainName__App.vue";
import { get__SubdomainName__AppConfig } from "./app-config.ts";

export const main = () => {
  setClientName("__subdomain-name__");
  createVueApp(App, get__SubdomainName__AppConfig());
};
