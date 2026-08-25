import {
  createRouter,
  createWebHistory,
  type RouterHistory,
  type RouteRecordRaw,
} from "vue-router";
import { adminLinks } from "@saflib/base-links";
import { PageNotFound } from "@saflib/vue/components";

// BEGIN WORKFLOW AREA page-imports FOR vue/add-view
import HomeAsync from "./pages/home/HomeAsync.vue";
import UsersAsync from "./pages/users/UsersAsync.vue";
import CronJobsAsync from "./pages/cron/CronJobsAsync.vue";
import JobsAsync from "./pages/jobs/JobsAsync.vue";
import EmailsAsync from "./pages/emails/EmailsAsync.vue";
import DevLogsAsync from "./pages/logs/DevLogsAsync.vue";
import MetricsAsync from "./pages/metrics/MetricsAsync.vue";
import ProductEventsAsync from "./pages/events/ProductEventsAsync.vue";
import ErrorsAsync from "./pages/errors/ErrorsAsync.vue";
import AuditLogsAsync from "./pages/audit/AuditLogsAsync.vue";
import TestUtilsAsync from "./pages/test-utils/TestUtilsAsync.vue";
// END WORKFLOW AREA

export const createAdminRouter = (options?: {
  history?: RouterHistory;
}) => {
  const routes: RouteRecordRaw[] = [
    // BEGIN WORKFLOW AREA page-routes FOR vue/add-view
    {
      path: adminLinks.home.path,
      component: HomeAsync,
    },
    {
      path: adminLinks.users.path,
      component: UsersAsync,
    },
    {
      path: adminLinks.cronJobs.path,
      component: CronJobsAsync,
    },
    {
      path: adminLinks.jobs.path,
      component: JobsAsync,
    },
    {
      path: adminLinks.emails.path,
      component: EmailsAsync,
    },
    {
      path: adminLinks.logs.path,
      component: DevLogsAsync,
    },
    {
      path: adminLinks.metrics.path,
      component: MetricsAsync,
    },
    {
      path: adminLinks.events.path,
      component: ProductEventsAsync,
    },
    {
      path: adminLinks.errors.path,
      component: ErrorsAsync,
    },
    {
      path: adminLinks.audit.path,
      component: AuditLogsAsync,
    },
    {
      path: adminLinks.testUtils.path,
      component: TestUtilsAsync,
    },
    // END WORKFLOW AREA
    { path: "/:pathMatch(.*)*", component: PageNotFound },
  ];
  return createRouter({
    history: options?.history ?? createWebHistory("/"),
    routes,
  });
};
