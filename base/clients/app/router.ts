import {
  createRouter,
  createWebHistory,
  type RouterHistory,
  type RouteRecordRaw,
} from "vue-router";
import { appLinks } from "@saflib/base-links";
import { PageNotFound } from "@saflib/vue/components";

// TODO: remove this log once appLinks is being used by the routes
console.log("appLinks:", appLinks);

// BEGIN WORKFLOW AREA page-imports FOR vue/add-view

// END WORKFLOW AREA

export const createAppRouter = (options?: {
  history?: RouterHistory;
}) => {
  const routes: RouteRecordRaw[] = [
    // BEGIN WORKFLOW AREA page-routes FOR vue/add-view




    // END WORKFLOW AREA
    { path: "/:pathMatch(.*)*", component: PageNotFound },
  ];
  return createRouter({
    history: options?.history ?? createWebHistory("/"),
    routes,
  });
};
