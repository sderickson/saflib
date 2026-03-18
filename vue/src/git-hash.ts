// Import this here so TypeScript doesn't complain about `import.meta.env`.
// @ts-expect-error - vite/client is not a module
import type { ImportMetaEnv as _ImportMetaEnv } from "vite/client";

interface ViteGitHashEnv {
  VITE_GIT_HASH_ROOT?: string;
  VITE_GIT_HASH_SAFLIB?: string;
}

const getGitHashEnv = () => import.meta.env as unknown as ViteGitHashEnv;

export interface GitHashes {
  root: string;
  saflib: string;
}

/**
 * Returns build-time git hashes, when provided via `VITE_GIT_HASH_ROOT` and
 * `VITE_GIT_HASH_SAFLIB` (e.g. through docker-compose `env_file`).
 */
export function getGitHashes(): GitHashes {
  const env = getGitHashEnv();
  const root = env.VITE_GIT_HASH_ROOT?.trim();
  const saflib = env.VITE_GIT_HASH_SAFLIB?.trim();
  return {
    root: root ? root : "unknown",
    saflib: saflib ? saflib : "unknown",
  };
}

