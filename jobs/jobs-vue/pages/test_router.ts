import { createRouter, createWebHistory } from "vue-router";
import JobsPage from "./JobsPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/jobs", component: JobsPage },
    { path: "/", redirect: "/jobs" },
  ],
});
