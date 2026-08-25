import {
  createRouter,
  createWebHistory,
  type RouterHistory,
  type RouteRecordRaw,
} from "vue-router";
import { adminLinks } from "@saflib/base-links";
import { PageNotFound } from "@saflib/vue/components";
import { isDevelopmentDeployment } from "@saflib/vue";
import { CronJobsAsync } from "@saflib/cron-vue";
import { JobsAsync } from "@saflib/jobs-vue";
import { SentEmailsAsync } from "@saflib/email-vue";
import { ProductEventsAsync } from "@saflib/analytics-vue";
import { MetricsAsync } from "@saflib/node-metrics-vue";
import { ErrorsAsync } from "@saflib/errors-vue";
import { AuditLogsAsync } from "@saflib/audit-vue";

// BEGIN WORKFLOW AREA page-imports FOR vue/add-view
import HomeAsync from "./pages/home/HomeAsync.vue";
import UsersAsync from "./pages/users/UsersAsync.vue";
import DevLogsAsync from "./pages/logs/DevLogsAsync.vue";
// END WORKFLOW AREA

const devObservabilityRoutes: RouteRecordRaw[] = isDevelopmentDeployment()
  ? [
      {
        path: adminLinks.emails.path,
        component: SentEmailsAsync,
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
    ]
  : [];

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
    ...devObservabilityRoutes,
    {
      path: adminLinks.audit.path,
      component: AuditLogsAsync,
    },
    // END WORKFLOW AREA
    { path: "/:pathMatch(.*)*", component: PageNotFound },
  ];
  return createRouter({
    history: options?.history ?? createWebHistory("/"),
    routes,
  });
};
