import { createRouter, createWebHistory } from "vue-router";
import AnalyticsEventsPage from "./AnalyticsEventsPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: "/events", component: AnalyticsEventsPage }],
});
