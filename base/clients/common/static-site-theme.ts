import type { App } from "vue";
import { createTanstackQueryClient } from "@saflib/sdk";
import {
  VueQueryPlugin,
  type VueQueryPluginOptions,
} from "@tanstack/vue-query";

/**
 * Plugins required by {@link BaseLayout} in VitePress static sites (Kratos session).
 * SPAs get the same via {@link @saflib/vue#createVueApp}; call this from the VitePress theme.
 */
export function enhanceStaticSiteApp(app: App): void {
  const queryClient = createTanstackQueryClient();
  const queryOptions: VueQueryPluginOptions = {
    enableDevtoolsV6Plugin: true,
    queryClient,
  };
  app.use(VueQueryPlugin, queryOptions);
}
