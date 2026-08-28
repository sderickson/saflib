import { createRouter, createWebHistory } from "vue-router";
import {
  HubPage,
  TimelinePage,
  CommitDetailPage,
  ComparePage,
  CheckoutPage,
  BuildPage,
} from "@saflib/dev-site-vue";

/** Same-origin API (Vite proxy in dev; Express static+API in built mode). */
const apiSubdomain = "";

const githubRepo =
  (import.meta as ImportMeta & { env?: Record<string, string> }).env
    ?.VITE_DEV_SITE_GITHUB_REPO || "PathClerk/pathclerk";

/** Fallback branch/tag when checkout branch is unavailable (e.g. before load). */
const githubRef =
  (import.meta as ImportMeta & { env?: Record<string, string> }).env
    ?.VITE_DEV_SITE_GITHUB_REF || "main";

/** Host path to the analyzed checkout — enables cursor/vscode file links. */
const localRepoRoot =
  (import.meta as ImportMeta & { env?: Record<string, string> }).env
    ?.VITE_DEV_SITE_LOCAL_REPO_ROOT || undefined;

export function createDevSiteRouter() {
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
          githubRepo,
          githubRef,
          localRepoRoot,
        },
      },
      {
        path: "/checkout/packages/:packageName",
        redirect: (to) => ({
          path: "/checkout",
          query: {
            package: decodeURIComponent(to.params.packageName as string),
          },
        }),
      },
      {
        path: "/build",
        component: BuildPage,
        props: { hubPath: "/" },
      },
      {
        path: "/commits/:hash",
        redirect: (to) => `/history/commits/${to.params.hash}`,
      },
      { path: "/compare", redirect: "/history/compare" },
    ],
  });
}
