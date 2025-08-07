import { createRouter, createWebHistory } from "vue-router";
import CronJobsPage from "./CronJobsPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: "", component: CronJobsPage }],
});
