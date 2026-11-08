import { createRouter, createWebHistory } from "vue-router";
import OpsTokensAsync from "./OpsTokensAsync.vue";
import LogsAsync from "./LogsAsync.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/ops/tokens", component: OpsTokensAsync },
    { path: "/ops/logs", component: LogsAsync },
    { path: "/", redirect: "/ops/tokens" },
  ],
});
