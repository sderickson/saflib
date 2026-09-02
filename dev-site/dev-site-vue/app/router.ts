import { createRouter, createWebHistory } from "vue-router";
import {
  HubPage,
  TimelinePage,
  CommitDetailPage,
  ComparePage,
  CheckoutPage,
  BuildPage,
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
