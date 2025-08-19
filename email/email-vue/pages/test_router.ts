import { createRouter, createWebHistory } from "vue-router";
import LastMockEmailPage from "./last-mock-email-page/LastMockEmailPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: "/last-email", component: LastMockEmailPage }],
});
