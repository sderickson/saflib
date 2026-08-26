import {
  createRouter,
  createWebHistory,
  type RouterHistory,
  type RouteRecordRaw,
} from "vue-router";
import { appLinks } from "@saflib/base-links";
import { PageNotFound } from "@saflib/vue/components";
import HomeAsync from "./pages/home/HomeAsync.vue";

// BEGIN WORKFLOW AREA page-imports FOR vue/add-view
// END WORKFLOW AREA

export const createAppRouter = (options?: {
  history?: RouterHistory;
}) => {
  const routes: RouteRecordRaw[] = [
    {
      path: appLinks.home.path,
      component: HomeAsync,
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
