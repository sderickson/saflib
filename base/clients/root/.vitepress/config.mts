import { defineConfig } from "vitepress";
import vuetify from "vite-plugin-vuetify";
import path from "path";
import { fileURLToPath } from "url";
import {
  copySharedPublicPlugin,
  sharedPublicDir,
} from "./copy-shared-public-plugin.ts";
import { workspacePackageExportsPlugin } from "@saflib/vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.resolve(__dirname, "../../../..");

export default defineConfig({
  title: "Base",
  description: "Static root site for Base",
  srcDir: "./content",
  vite: {
    publicDir: sharedPublicDir,
    define: {
      __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
    },
    ssr: {
      noExternal: ["vuetify"],
    },
    server: {
      fs: {
        allow: [monorepoRoot],
      },
    },
    esbuild: {
      // Avoid walking TS project references to dev-only packages (vitest, playwright)
      // missing from minimal Docker images for static-root builds.
      tsconfigRaw: {
        compilerOptions: {
          target: "esnext",
          jsx: "preserve",
          skipLibCheck: true,
        },
      },
    },
    plugins: [
      workspacePackageExportsPlugin({ monorepoRoot }),
      copySharedPublicPlugin(sharedPublicDir),
      vuetify({
        styles: {
          configFile: path.resolve(__dirname, "./vuetify-settings.scss"),
        },
      }),
    ],
  },
  head: [
    [
      "link",
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
    ],
    [
      "link",
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossorigin: "",
      },
    ],
    [
      "link",
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Roboto:ital,wght@0,100..900;1,100..900&display=swap",
      },
    ],
  ],
});
