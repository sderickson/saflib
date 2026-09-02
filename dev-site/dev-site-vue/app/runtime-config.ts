export type DevSiteRuntimeConfig = {
  github_repo?: string;
  githubRef?: string;
  /** Absolute git repo root the dev-site server analyzes (DEV_SITE_REPO_ROOT). */
  repo_root?: string;
};

declare global {
  interface Window {
    __DEV_SITE_CONFIG__?: DevSiteRuntimeConfig;
  }
}

/** Server-injected config from `index.html` (see dev-site-http static serving). */
export function readDevSiteRuntimeConfig(): DevSiteRuntimeConfig {
  if (typeof window === "undefined") {
    return {};
  }
  return window.__DEV_SITE_CONFIG__ ?? {};
}
