import {
  createRouter,
  createWebHistory,
  type RouterHistory,
  type RouteRecordRaw,
} from "vue-router";
import { adminLinks } from "@saflib/base-links";
import { PageNotFound } from "@saflib/vue/components";
import { isDevelopmentDeployment, scrollBehavior } from "@saflib/vue";
import { CronJobsAsync } from "@saflib/cron-vue";
import { JobsAsync } from "@saflib/jobs-vue";
import { SentEmailsAsync } from "@saflib/email-vue";
import { AuditLogsAsync } from "@saflib/audit-vue";
import { UsersAsync } from "@saflib/ory-kratos-vue";
import {
  AlertsAsync,
  DependenciesAsync,
  DiagnosticsAsync,
  IssuesAsync,
  LogsAsync,
  OpsMetricsAsync,
  OpsTokensAsync,
} from "@saflib/ops-vue";
import HomeAsync from "./pages/home/HomeAsync.vue";
import DevLogsAsync from "./pages/logs/DevLogsAsync.vue";

// BEGIN WORKFLOW AREA page-imports FOR vue/add-view
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
    {
      path: adminLinks.opsLogs.path,
      component: LogsAsync,
    },
    {
      path: adminLinks.opsIssues.path,
      component: IssuesAsync,
    },
    {
      path: adminLinks.opsAlerts.path,
      component: AlertsAsync,
    },
    {
      path: adminLinks.opsMetrics.path,
      component: OpsMetricsAsync,
    },
    {
      path: adminLinks.opsDependencies.path,
      component: DependenciesAsync,
    },
    {
      path: adminLinks.opsTokens.path,
      component: OpsTokensAsync,
    },
    {
      path: adminLinks.diagnostics.path,
      component: DiagnosticsAsync,
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
