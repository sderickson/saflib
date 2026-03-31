import type { Theme } from "vitepress";
import { createVuetify } from "vuetify";
import { vuetifyConfig } from "template-package-clients-common/vuetify-config";
import "@mdi/font/css/materialdesignicons.css";
import "vuetify/styles";
import "./style.css";
import StaticSiteLayout from "./components/StaticSiteLayout.vue";
import __ProductName__HomePage from "./components/__ProductName__HomePage.vue";

import { setClientName } from "@saflib/links";

setClientName("__product-name__");

const vuetify = createVuetify(vuetifyConfig);

export default {
  Layout: StaticSiteLayout,
  enhanceApp({ app }) {
    app.use(vuetify);
    app.component("__ProductName__HomePage", __ProductName__HomePage);
  },
} satisfies Theme;
