import {
  createRouter,
  createWebHistory,
  type RouterHistory,
  type RouteRecordRaw,
} from "vue-router";
import { __subdomainName__Links } from "@saflib/base-links";
import { PageNotFound } from "@saflib/vue/components";
import HomePage from "./pages/home/HomePage.vue";

// BEGIN WORKFLOW AREA page-imports FOR vue/add-view
import __FullName__Async from "./__group-name__/__TargetName__Async.vue";
// END WORKFLOW AREA

export const create__SubdomainName__Router = (options?: {
  history?: RouterHistory;
}) => {
  const routes: RouteRecordRaw[] = [
    {
      path: __subdomainName__Links.home.path,
      component: HomePage,
    },
    // BEGIN WORKFLOW AREA page-routes FOR vue/add-view
    {
      path: __subdomainName__Links.__fullName__.path,
      component: __FullName__Async,
    },
    // END WORKFLOW AREA
    { path: "/:pathMatch(.*)*", component: PageNotFound },
  ];
  return createRouter({
    history: options?.history ?? createWebHistory("/"),
    routes,
  });
};
