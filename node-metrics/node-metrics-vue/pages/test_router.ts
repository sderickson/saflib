import { createRouter, createWebHistory } from "vue-router";
import MetricsPage from "./MetricsPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: "/metrics", component: MetricsPage }],
});
