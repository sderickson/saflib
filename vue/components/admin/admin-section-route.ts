import type { Component } from "vue";
import type { RouteRecordRaw } from "vue-router";
import AdminSection from "./AdminSection.vue";

export interface AdminSectionRouteTab {
  label: string;
  /** The page's own path; kept absolute so existing links keep working. */
  path: string;
  component: Component;
  props?: Record<string, unknown>;
}

/**
 * Routes for a sidebar section of tabbed pages: a parent rendering
 * AdminSection (title and tabs) with each page as a child at its own path.
 * The section's path redirects to its first tab.
 */
export function adminSectionRoute(options: {
  /** e.g. "/logs"; only used to redirect to the first tab. */
  path: string;
  title: string;
  tabs: AdminSectionRouteTab[];
}): RouteRecordRaw {
  const first = options.tabs[0];
  if (!first) throw new Error(`adminSectionRoute ${options.path}: needs at least one tab`);
  return {
    path: options.path,
    component: AdminSection,
    props: { title: options.title, tabs: options.tabs.map((t) => ({ label: t.label, to: t.path })) },
    redirect: options.path === first.path ? undefined : first.path,
    children: options.tabs.map((t) => ({ path: t.path, component: t.component, props: t.props ?? {} })),
  };
}

/** The paths a section's sidebar item should light up for. */
export const adminSectionPaths = (tabs: { path: string }[]) => tabs.map((t) => t.path);
