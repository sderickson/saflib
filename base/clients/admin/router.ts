import {
  createRouter,
  createWebHistory,
  type RouterHistory,
  type RouteRecordRaw,
} from "vue-router";
import { adminLinks } from "@saflib/base-links";
import { PageNotFound } from "@saflib/vue/components";

// TODO: remove this log once adminLinks is being used by the routes
console.log("adminLinks:", adminLinks);

// BEGIN WORKFLOW AREA page-imports FOR vue/add-view

// END WORKFLOW AREA

export const createAdminRouter = (options?: {
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
