import {
  createRouter,
  createWebHistory,
  type RouterHistory,
  type RouteRecordRaw,
} from "vue-router";
import { adminLinks } from "@saflib/base-links";
import { adminSectionRoutes } from "./sections.ts";
import { PageNotFound } from "@saflib/vue/components";
import { isDevelopmentDeployment, scrollBehavior } from "@saflib/vue";
import { SentEmailsAsync } from "@saflib/email-vue";
import { UsersAsync } from "@saflib/ory-kratos-vue";
import { BackupsAsync, OpsTokensAsync } from "@saflib/ops-vue";
import HomeAsync from "./pages/home/HomeAsync.vue";

// BEGIN WORKFLOW AREA page-imports FOR vue/add-view
// END WORKFLOW AREA

const devObservabilityRoutes: RouteRecordRaw[] = isDevelopmentDeployment()
  ? [
      {
        path: adminLinks.emails.path,
        component: SentEmailsAsync,
      },
    ]
  : [];

export const createAdminRouter = (options?: {
  history?: RouterHistory;
}) => {
  const routes: RouteRecordRaw[] = [
    {
      path: adminLinks.home.path,
      component: HomeAsync,
    },
    {
      path: adminLinks.backups.path,
      component: BackupsAsync,
    },
    {
      path: adminLinks.users.path,
      component: UsersAsync,
    },
    ...devObservabilityRoutes,
    // System sections (Issues, Logs, Jobs, Metrics, Status): tabbed pages.
    ...adminSectionRoutes,
    {
      path: adminLinks.opsTokens.path,
      component: OpsTokensAsync,
    },
    // BEGIN WORKFLOW AREA page-routes FOR vue/add-view
    // END WORKFLOW AREA
    { path: "/:pathMatch(.*)*", component: PageNotFound },
  ];
  return createRouter({
    history: options?.history ?? createWebHistory("/"),
    routes,
    scrollBehavior,
  });
};
