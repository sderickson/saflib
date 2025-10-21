// Import this here so that typescript is okay with accessing import.meta.env
// @ts-expect-error - vite/client is not a module
import type { ImportMetaEnv as _ImportMetaEnv } from "vite/client";

// I called this "wip-env" because this should probably be incorporated into @saflib/env's system eventually, and also "env.ts" gets overwritten by @saflib/env

interface ViteEnv {
  NODE_ENV: string;
}

/**
 * Get the vite environment variables.
 */
const getViteEnv = () => {
  return import.meta.env as unknown as ViteEnv;
};

export const isTestEnv = () => {
  return getViteEnv().NODE_ENV === "test";
};
