import type { Theme } from "vitepress";
import { createVuetify } from "vuetify";
import { vuetifyConfig } from "@saflib/base-clients-common/vuetify-config";
import { enhanceStaticSiteApp } from "@saflib/base-clients-common/static-site-theme";
import "vuetify/styles";
import "./style.css";
import StaticSiteLayout from "./components/StaticSiteLayout.vue";
import __SubdomainName__HomePage from "./components/__SubdomainName__HomePage.vue";

import { setClientName } from "@saflib/links";

setClientName("__subdomain-name__");

const vuetify = createVuetify(vuetifyConfig);

export default {
  Layout: StaticSiteLayout,
  enhanceApp({ app }) {
    enhanceStaticSiteApp(app);
    app.use(vuetify);
    app.component("__SubdomainName__HomePage", __SubdomainName__HomePage);
  },
} satisfies Theme;
