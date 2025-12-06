import {
  createWebHistory,
  createRouter,
  type Router,
  type RouteRecordRaw,
} from "vue-router";
import TestUtilsPage from "./pages/test-utils/TestUtilsPage.vue";
import { LastMockEmailPageAsync } from "@saflib/email-vue";
import { CronJobsPage } from "@saflib/cron-vue";

let router: Router;

interface AdminRouterOptions {
  additionalRoutes?: RouteRecordRaw[];
  testUtilsPath?: string;
  mockEmailsPath?: string;
  cronJobsPath?: string;
  cronJobsSubdomain?: string;
}

export const createAdminRouter = (options: AdminRouterOptions = {}) => {
  if (router) {
    return router;
  }
  const routes: RouteRecordRaw[] = [
    ...(options?.additionalRoutes ?? []),
    {
      path: options?.testUtilsPath || "/test-utils",
      component: TestUtilsPage,
    },
    {
      path: options?.mockEmailsPath || "/mock-emails/last",
      component: LastMockEmailPageAsync,
      name: "LastMockEmail",
    },
    {
      path: options?.cronJobsPath || "/cron",
      component: CronJobsPage,
      name: "Cron Jobs",
      props: {
        subdomain: options?.cronJobsSubdomain,
      },
    },
  ];

  router = createRouter({
    history: createWebHistory(),
    routes,
  });
  return router;
};
