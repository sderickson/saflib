import type { App } from "vue";
import type { Theme } from "vitepress";
import { createVuetify } from "vuetify";
import { vuetifyConfig } from "@saflib/base-clients-common/vuetify-config";
import { enhanceStaticSiteApp } from "@saflib/base-clients-common/static-site-theme";
import "@saflib/base-clients-common/style-imports";
import "./style.css";
import StaticSiteLayout from "./components/StaticSiteLayout.vue";

import { setClientName } from "@saflib/links";

setClientName("root");

const vuetify = createVuetify(vuetifyConfig);

// `as Theme` (not `satisfies`) — assigning Layout to Theme crashes TS 6's
// satisfies elaborator when VitePress's nested @vue/* types diverge by path.
export default {
  Layout: StaticSiteLayout,
  enhanceApp({ app }) {
    const vueApp = app as unknown as App;
    enhanceStaticSiteApp(vueApp);
    vueApp.use(vuetify);
  },
} as Theme;
