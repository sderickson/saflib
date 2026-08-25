import {
  createRouter,
  createWebHistory,
  type RouterHistory,
  type RouteRecordRaw,
} from "vue-router";
import { accountLinks } from "@saflib/base-links";
import { PageNotFound } from "@saflib/vue/components";

// BEGIN WORKFLOW AREA page-imports FOR vue/add-view
import ProfileAsync from "./pages/profile/ProfileAsync.vue";
// END WORKFLOW AREA

export const createAccountRouter = (options?: {
  history?: RouterHistory;
}) => {
  const routes: RouteRecordRaw[] = [
    // BEGIN WORKFLOW AREA page-routes FOR vue/add-view
    {
      path: accountLinks.profile.path,
      component: ProfileAsync,
    },
    // END WORKFLOW AREA
    { path: "/:pathMatch(.*)*", component: PageNotFound },
  ];
  return createRouter({
    history: options?.history ?? createWebHistory("/"),
    routes,
  });
};
