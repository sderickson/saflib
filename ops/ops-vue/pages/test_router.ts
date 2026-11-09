import { createRouter, createWebHistory } from "vue-router";
import OpsTokensAsync from "./OpsTokensAsync.vue";
import LogsAsync from "./LogsAsync.vue";
import IssuesAsync from "./IssuesAsync.vue";
import AlertsAsync from "./AlertsAsync.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/ops/tokens", component: OpsTokensAsync },
    { path: "/ops/logs", component: LogsAsync },
    { path: "/ops/issues", component: IssuesAsync },
    { path: "/ops/alerts", component: AlertsAsync },
    { path: "/", redirect: "/ops/tokens" },
  ],
});
