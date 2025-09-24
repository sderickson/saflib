import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";
import vueDevTools from "vite-plugin-vue-devtools";
import type { Plugin, PluginOption } from "vite";
import path from "path";
import ignore from "rollup-plugin-ignore";
// import { htmlHeaderPlugin } from "../../clients/spas/html-header-plugin.ts";
import { typedEnv } from "./env.ts";
import fs from "fs";

const subdomains = typedEnv.CLIENT_SUBDOMAINS?.split(",") ?? [];
const domain = typedEnv.DOMAIN;
const hosts = subdomains.map((subdomain) =>
  subdomain === "" ? domain : `${subdomain}.${domain}`,
);

const subDomainProxyPlugin: Plugin = {
  name: "sub-domain-proxy",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url?.includes(".") || req.url?.includes("@")) {
        next();
        return;
      }
      for (const host of hosts) {
        if (req.headers.host === host) {
          const subdomain = host
            .replace(`${domain}`, "")
            .split(".")
            .filter(Boolean)
            .join(".");
          req.url = `/${subdomain}/index.html`;
          next();
          return;
        }
      }
      console.warn("Unhandled request", {
        "req.url": req.url,
        "req.headers.host": req.headers.host,
        hosts,
      });
      next();
    });
  },
};

const input = {
  index: path.resolve(process.cwd(), "index.html"),
  ...Object.fromEntries(
    subdomains
      .filter((subdomain) => subdomain !== "")
      .map((subdomain) => [
        subdomain,
        path.resolve(process.cwd(), `${subdomain}/index.html`),
      ])
      .filter(([_, path]) => fs.existsSync(path)),
  ),
};

/**
 * Arguments for makeConfig
 */
export interface MakeConfigProps {
  /**
   * Additional plugins to include in the Vite config. Vue, Vuetify, VueDevTools, and a SPA proxy plugin are included by default.
   */
  plugins?: PluginOption[];
  /**
   * A relative path (from process.cwd()) to the Vuetify style configFile override.
   */
  vuetifyOverrides?: string;
  /**
   * The absolute path of the root of the monorepo, to ensure vite has access to saflib packages.
   */
  monorepoRoot?: string;
}

/**
 * Make a Vite config for a multi-SPA, SAF project. Includes all the expected plugins.
 */
export function makeConfig(config: MakeConfigProps = {}) {
  const { plugins = [], vuetifyOverrides, monorepoRoot } = config;
  return defineConfig({
    base: "/",
    appType: "mpa",
    plugins: [
      vue(),
      vueDevTools(),
      vuetify(
        vuetifyOverrides ? { styles: { configFile: vuetifyOverrides } } : {},
      ),
      ...plugins,
      subDomainProxyPlugin,
    ],
    build: {
      rollupOptions: {
        input,
        plugins: [ignore(["**/*.test.ts"])],
      },
      sourcemap: true,
    },

    server: {
      fs: {
        allow: [monorepoRoot ?? "."], // works inside and outside of docker
      },
      strictPort: true,
      host: true,
    },
  });
}
