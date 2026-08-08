declare module "@saflib/vue/vitest-config" {
  import type { UserConfig } from "vitest/config";
  export const defaultConfig: UserConfig;
  export const defaultConfigWithCoverageEnforcement: UserConfig;
}
