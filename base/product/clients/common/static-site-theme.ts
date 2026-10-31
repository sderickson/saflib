import type { App } from "vue";
import { createTanstackQueryClient } from "@saflib/sdk";
import {
  VueQueryPlugin,
  type VueQueryPluginOptions,
} from "@tanstack/vue-query";
import "./components/marketing/marketing.css";
import { registerMarketingComponents } from "./components/marketing/register.ts";

/**
 * Plugins required by {@link BaseLayout} in VitePress static sites (Kratos session).
 * SPAs get the same via {@link @saflib/vue#createVueApp}; call this from the VitePress theme.
 *
 * Load shared CSS via `@saflib/base-clients-common/style-imports` in
 * `.vitepress/theme/index.ts` (same as SPAs). Register Vuetify with
 * {@link vuetifyConfig} from `@saflib/base-clients-common/vuetify-config`.
 */
export function enhanceStaticSiteApp(app: App): void {
  const queryClient = createTanstackQueryClient();
  const queryOptions: VueQueryPluginOptions = {
    enableDevtoolsV6Plugin: true,
    queryClient,
  };
  app.use(VueQueryPlugin, queryOptions);
  registerMarketingComponents(app);
}
