import { createRouter, createWebHistory } from "vue-router";
import CronJobsAsync from "./CronJobsAsync.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/cron/jobs", component: CronJobsAsync },
    { path: "/", redirect: "/cron/jobs" },
  ],
});
