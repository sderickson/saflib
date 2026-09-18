import { createRouter, createWebHistory } from "vue-router";
import {
  HubPage,
  TimelinePage,
  CommitDetailPage,
  ComparePage,
  CheckoutPage,
  PlansPage,
} from "../index.ts";
import { readDevSiteRuntimeConfig } from "./runtime-config.ts";

/** Same-origin API (Vite proxy in dev; Express static+API in built mode). */
const apiSubdomain = "";

export type CreateDevSiteRouterOptions = {
  github_repo?: string;
  githubRef?: string;
  localRepoRoot?: string;
};

function envString(key: string, fallback: string): string {
  return (
    (import.meta as ImportMeta & { env?: Record<string, string> }).env?.[
      key
    ] ?? fallback
  );
}

export function createDevSiteRouter(options: CreateDevSiteRouterOptions = {}) {
  const runtime = readDevSiteRuntimeConfig();
  const github_repo =
    options.github_repo ??
    runtime.github_repo ??
    envString("VITE_DEV_SITE_GITHUB_REPO", "sderickson/saflib");
  const githubRef =
    options.githubRef ??
    runtime.githubRef ??
    envString("VITE_DEV_SITE_GITHUB_REF", "main");
  const localRepoRoot =
    options.localRepoRoot ??
    runtime.repo_root ??
    (import.meta as ImportMeta & { env?: Record<string, string> }).env
      ?.VITE_DEV_SITE_LOCAL_REPO_ROOT;

  return createRouter({
    history: createWebHistory("/"),
    routes: [
      {
        path: "/",
        component: HubPage,
      },
      {
        path: "/history",
        component: TimelinePage,
        props: {
          subdomain: apiSubdomain,
          hubPath: "/",
          detailPath: (hash: string) => `/history/commits/${hash}`,
          comparePath: (hash: string) => `/history/compare?to=${hash}`,
        },
      },
      {
        path: "/history/commits/:hash",
        component: CommitDetailPage,
        props: (route) => ({
          subdomain: apiSubdomain,
          hash: route.params.hash as string,
        }),
      },
      {
        path: "/history/compare",
        component: ComparePage,
        props: (route) => ({
          subdomain: apiSubdomain,
          initialFromHash:
            typeof route.query.from === "string" ? route.query.from : undefined,
          initialToHash:
            typeof route.query.to === "string" ? route.query.to : undefined,
        }),
      },
      {
        path: "/checkout",
        component: CheckoutPage,
        props: {
          subdomain: apiSubdomain,
          hubPath: "/",
          github_repo,
          githubRef,
          localRepoRoot,
        },
      },
      {
        path: "/checkout/packages/:package_name",
        redirect: (to) => ({
          path: "/checkout",
          query: {
            package: decodeURIComponent(to.params.package_name as string),
          },
        }),
      },
      {
        path: "/plans",
        component: PlansPage,
        props: { hubPath: "/" },
      },
      // Extension-specific routes first (most specific to least), so a
      // `.md`/`.yaml` file matches its dedicated view; anything else falls
      // through to the plain-text catch-all. All three render the same
      // `PlansPage` — it reads `planName`/`fileName` off the route itself
      // (same `useRoute().params` pattern `RunView` uses for its `runId`)
      // and picks a view
      // based on the file's extension.
      {
        path: "/plans/:planName/:fileName(.+\\.md)",
        component: PlansPage,
        props: { hubPath: "/" },
      },
      {
        path: "/plans/:planName/:fileName(.+\\.ya?ml)",
        component: PlansPage,
        props: { hubPath: "/" },
      },
      {
        path: "/plans/:planName/:fileName",
        component: PlansPage,
        props: { hubPath: "/" },
      },
      // Merged into /plans — see PlansPage. A workflow file's run now
      // shows inline there (no more standalone run URLs at all).
      { path: "/build", redirect: "/plans" },
      { path: "/workflows", redirect: "/plans" },
      { path: "/workflows/runs/:runId", redirect: "/plans" },
      {
        path: "/commits/:hash",
        redirect: (to) => `/history/commits/${to.params.hash}`,
      },
      { path: "/compare", redirect: "/history/compare" },
    ],
  });
}
