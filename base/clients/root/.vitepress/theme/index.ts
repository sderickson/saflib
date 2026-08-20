import type { Theme } from "vitepress";
import { createVuetify } from "vuetify";
import { vuetifyConfig } from "@saflib/base-clients-common/vuetify-config";
import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";
import "./style.css";
import StaticSiteLayout from "./components/StaticSiteLayout.vue";
import RootHomePage from "./components/RootHomePage.vue";

import { setClientName } from "@saflib/links";

setClientName("root");

const vuetify = createVuetify(vuetifyConfig);

export default {
  Layout: StaticSiteLayout,
  enhanceApp({ app }) {
    app.use(vuetify);
    app.component("RootHomePage", RootHomePage);
  },
} satisfies Theme;
