import path from "node:path";
import { defineConfig, mergeConfig } from "vite";
import { makeConfig } from "@saflib/vite";

const packageDir = import.meta.dirname;
const monorepoRoot = path.resolve(packageDir, "../../../..");

const apiTarget = process.env.DEV_SITE_API_PROXY_TARGET || "http://127.0.0.1:3099";

export default mergeConfig(
  makeConfig({
    monorepoRoot,
    appType: "spa",
    useSubdomainProxy: false,
    vuetifyOverrides: path.resolve(packageDir, "./overrides.scss"),
  }),
  defineConfig({
    server: {
      port: 5199,
      proxy: {
        "/api": { target: apiTarget, changeOrigin: true },
      },
    },
    preview: {
      port: 5199,
    },
  }),
);
