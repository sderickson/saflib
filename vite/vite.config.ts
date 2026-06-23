import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";
import vueDevTools from "vite-plugin-vue-devtools";
import type { PluginOption, UserConfig } from "vite";
import path from "path";
import ignore from "rollup-plugin-ignore";
// import { htmlHeaderPlugin } from "../../clients/spas/html-header-plugin.ts";
import { typedEnv } from "./env.ts";
import fs from "fs";
import { getSubdomainProxyRewrite } from "./subdomain-proxy.ts";

export { getSubdomainProxyRewrite } from "./subdomain-proxy.ts";

const subdomains = typedEnv.CLIENT_SUBDOMAINS?.split(",") ?? [];
const domain = typedEnv.DOMAIN;
const hosts = subdomains.map((subdomain) =>
  subdomain === "" ? domain : `${subdomain}.${domain}`,
);

const subDomainProxyPlugin: PluginOption = {
  name: "sub-domain-proxy",
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      const rewrite = getSubdomainProxyRewrite(
        req.url,
        req.headers.host,
        hosts,
        domain,
      );
      if (rewrite !== null) {
        req.url = rewrite;
        next();
        return;
      }
      const host = req.headers.host;
      if (
        req.url &&
        !req.url.split("?")[0].includes(".") &&
        !req.url.split("?")[0].includes("@") &&
        host &&
        !host.startsWith("localhost") &&
        !hosts.includes(host)
      ) {
        console.warn("Unhandled request", {
          "req.url": req.url,
          "req.headers.host": host,
          hosts,
        });
      }
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
  /**
   * appType: "spa" | "mpa"
   */
  appType?: "spa" | "mpa";
  /**
   * Use subdomain proxy plugin
   */
  useSubdomainProxy?: boolean;
  /**
   * Emit `.js.map` files alongside chunks. Disable for production deploys where maps must not be served publicly (Sentry uploads may still use plugin defaults).
   * @default true
   */
  sourcemap?: boolean;
}

function buildPlugins({
  extraPlugins,
  useSubdomainProxy,
  vuetifyOverrides,
}: {
  extraPlugins: PluginOption[];
  useSubdomainProxy: boolean;
  vuetifyOverrides?: string;
}): PluginOption[] {
  const plugins: PluginOption[] = [
    vue(),
    vueDevTools(),
    vuetify(
      vuetifyOverrides ? { styles: { configFile: vuetifyOverrides } } : {},
    ),
  ];

  if (useSubdomainProxy) {
    plugins.push(subDomainProxyPlugin);
  }

  plugins.push(...extraPlugins);
  return plugins;
}

/**
 * Make a Vite config for a multi-SPA, SAF project. Includes all the expected plugins.
 */
export function makeConfig(config: MakeConfigProps = {}): UserConfig {
  const {
    plugins: extraPlugins = [],
    vuetifyOverrides,
    monorepoRoot,
    sourcemap,
  } = config;

  return {
    base: "/",
    appType: config.appType ?? "mpa",
    plugins: buildPlugins({
      extraPlugins,
      useSubdomainProxy: config.useSubdomainProxy !== false,
      vuetifyOverrides,
    }),
    build: {
      rollupOptions: {
        input,
        plugins: [ignore(["**/*.test.ts"])],
      },
      sourcemap: sourcemap ?? true,
    },

    server: {
      fs: {
        allow: [monorepoRoot ?? "."], // works inside and outside of docker
      },
      strictPort: true,
      host: true,
    },
  };
}
