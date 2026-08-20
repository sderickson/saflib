import {
  createRouter,
  createWebHistory,
  type RouterHistory,
  type RouteRecordRaw,
} from "vue-router";
import { accountLinks } from "@saflib/base-links";
import { PageNotFound } from "@saflib/vue/components";

// TODO: remove this log once accountLinks is being used by the routes
console.log("accountLinks:", accountLinks);

// BEGIN WORKFLOW AREA page-imports FOR vue/add-view

// END WORKFLOW AREA

export const createAccountRouter = (options?: {
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
