import path from "node:path";
import { defineConfig, mergeConfig, type UserConfig } from "vite";
import { makeConfig } from "@saflib/vite";

export type DevSiteViteConfigOptions = {
  /** Monorepo root passed to workspace package resolution (usually saflib root). */
  monorepoRoot: string;
  /** Optional SCSS overrides path for Vuetify theming. */
  vuetifyOverrides?: string;
  /** Vite dev/preview port. Defaults to 5199. */
  port?: number;
  /** API proxy target for `/api`. Defaults to http://127.0.0.1:3099. */
  apiTarget?: string;
};

/** Shared Vite config for dev-site SPAs (proxy to API, Vuetify, workspace resolution). */
export function devSiteViteConfig(options: DevSiteViteConfigOptions): UserConfig {
  const port = options.port ?? 5199;
  const apiTarget =
    options.apiTarget ??
    process.env.DEV_SITE_API_PROXY_TARGET ??
    "http://127.0.0.1:3099";

  return mergeConfig(
    makeConfig({
      monorepoRoot: options.monorepoRoot,
      appType: "spa",
      useSubdomainProxy: false,
      vuetifyOverrides:
        options.vuetifyOverrides ??
        path.resolve(import.meta.dirname, "../overrides.scss"),
    }),
    defineConfig({
      server: {
        port,
        proxy: {
          "/api": { target: apiTarget, changeOrigin: true },
        },
      },
      preview: {
        port,
      },
    }),
  );
}
