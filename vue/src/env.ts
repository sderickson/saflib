// Import this here so that typescript is okay with accessing import.meta.env
// @ts-expect-error - vite/client is not a module
import type { ImportMetaEnv as _ImportMetaEnv } from "vite/client";

/**
 * Get the vite environment variables.
 */
export const getViteEnv = () => {
  return import.meta.env;
};
