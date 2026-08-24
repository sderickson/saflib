import { createRouter, createWebHistory } from "vue-router";
import DevLogsPage from "./DevLogsPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: "/dev-logs", component: DevLogsPage }],
});
