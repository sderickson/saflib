import { createRouter, createWebHistory } from "vue-router";
import OpsTokensAsync from "./OpsTokensAsync.vue";
import LogsAsync from "./LogsAsync.vue";
import IssuesAsync from "./IssuesAsync.vue";
import AlertsAsync from "./AlertsAsync.vue";
import OpsMetricsAsync from "./OpsMetricsAsync.vue";
import DependenciesAsync from "./DependenciesAsync.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/ops/tokens", component: OpsTokensAsync },
    { path: "/ops/logs", component: LogsAsync },
    { path: "/ops/issues", component: IssuesAsync },
    { path: "/ops/alerts", component: AlertsAsync },
    { path: "/ops/metrics", component: OpsMetricsAsync },
    { path: "/ops/dependencies", component: DependenciesAsync },
    { path: "/", redirect: "/ops/tokens" },
  ],
});
