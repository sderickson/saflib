import { makeConfig } from "@saflib/vite";
import { htmlHeaderPlugin } from "./html-header-plugin.ts";
import path from "path";
import { defineConfig, mergeConfig } from "vite";
import { validateEnv } from "@saflib/env";
import envSchema from "./env.schema.combined.json" with { type: "json" };
import { typedEnv } from "./env.ts";

validateEnv(process.env, envSchema);

const monorepoRoot = path.resolve(import.meta.dirname, "../../..");

export default mergeConfig(
  makeConfig({
    plugins: [htmlHeaderPlugin()],

    vuetifyOverrides: "./overrides.scss",
    monorepoRoot,
  }),
  defineConfig({
    define: {
      "import.meta.env.VITE_DEPLOYMENT_NAME": JSON.stringify(
        typedEnv.DEPLOYMENT_NAME,
      ),
    },
  }),
);
