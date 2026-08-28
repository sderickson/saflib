import path from "node:path";
import { defineConfig } from "vite";
import { devSiteViteConfig } from "@saflib/dev-site-vue/vite-config";

const packageDir = import.meta.dirname;
const monorepoRoot = path.resolve(packageDir, "../../../..");

export default defineConfig(
  devSiteViteConfig({
    monorepoRoot,
  }),
);
