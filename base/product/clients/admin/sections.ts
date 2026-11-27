import { adminLinks } from "@saflib/base-links";
import { adminSectionPaths, adminSectionRoute, type AdminSectionRouteTab } from "@saflib/vue/components";
import { CronJobsAsync } from "@saflib/cron-vue";
import { JobsAsync } from "@saflib/jobs-vue";
import { AuditLogsAsync } from "@saflib/audit-vue";
import {
  AlertsAsync,
  BuildAsync,
  DependenciesAsync,
  DiagnosticsAsync,
  HealthAsync,
  IssuesAsync,
  LogsAsync,
  OpsMetricsAsync,
  ProcessMetricsAsync,
  AnalyticsExploreAsync,
  AnalyticsTrendsAsync,
} from "@saflib/ops-vue";
import { adminRepos } from "./repos.ts";

/**
 * The admin's sections (Analytics, and the System ones): each is one sidebar item whose pages are its
 * tabs. Pages keep their own paths, so links to them still work.
 */
export const adminSections = {
  analytics: {
    path: "/section/analytics",
    title: "Analytics",
    tabs: [
      { label: "Explore", path: adminLinks.analytics.path, component: AnalyticsExploreAsync },
      { label: "Trends", path: adminLinks.analyticsTrends.path, component: AnalyticsTrendsAsync },
    ],
  },
  issues: {
    path: "/section/issues",
    title: "Issues",
    tabs: [
      { label: "Issues", path: adminLinks.opsIssues.path, component: IssuesAsync },
      { label: "Alerts", path: adminLinks.opsAlerts.path, component: AlertsAsync },
    ],
  },
  logs: {
    path: "/section/logs",
    title: "Logs",
    tabs: [
      { label: "Server", path: adminLinks.opsLogs.path, component: LogsAsync },
      { label: "Audit", path: adminLinks.audit.path, component: AuditLogsAsync },
    ],
  },
  jobs: {
    path: "/section/jobs",
    title: "Jobs",
    tabs: [
      { label: "Queue", path: adminLinks.jobs.path, component: JobsAsync },
      { label: "Schedules", path: adminLinks.cronJobs.path, component: CronJobsAsync },
    ],
  },
  metrics: {
    path: "/section/metrics",
    title: "Metrics",
    tabs: [
      { label: "Prometheus", path: adminLinks.opsMetrics.path, component: OpsMetricsAsync },
      { label: "This process", path: adminLinks.opsMetricsProcess.path, component: ProcessMetricsAsync },
    ],
  },
  status: {
    path: "/section/status",
    title: "Status",
    tabs: [
      { label: "Health", path: adminLinks.statusHealth.path, component: HealthAsync },
      { label: "Dependencies", path: adminLinks.opsDependencies.path, component: DependenciesAsync },
      { label: "Build", path: adminLinks.statusBuild.path, component: BuildAsync, props: { repos: adminRepos } },
      {
        label: "Self-test",
        path: adminLinks.diagnostics.path,
        component: DiagnosticsAsync,
        props: {
          links: {
            issues: adminLinks.opsIssues.path,
            logs: adminLinks.opsLogs.path,
            jobs: adminLinks.jobs.path,
            audit: adminLinks.audit.path,
            alerts: adminLinks.opsAlerts.path,
            metrics: adminLinks.opsMetrics.path,
          },
        },
      },
    ],
  },
} satisfies Record<string, { path: string; title: string; tabs: AdminSectionRouteTab[] }>;

export const adminSectionRoutes = Object.values(adminSections).map((s) => adminSectionRoute(s));

/** Paths a section's sidebar item lights up for. */
export const sectionMatch = (key: keyof typeof adminSections) => adminSectionPaths(adminSections[key].tabs);
