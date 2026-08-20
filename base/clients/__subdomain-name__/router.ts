import {
  createRouter,
  createWebHistory,
  type RouterHistory,
  type RouteRecordRaw,
} from "vue-router";
import { __subdomainName__Links } from "@saflib/base-links";
import { PageNotFound } from "@saflib/vue/components";
import HomePage from "./home/HomePage.vue";

// BEGIN WORKFLOW AREA page-imports FOR vue/add-view

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

    // END WORKFLOW AREA
    { path: "/:pathMatch(.*)*", component: PageNotFound },
  ];
  return createRouter({
    history: options?.history ?? createWebHistory("/"),
    routes,
  });
};
