import { createRouter, createWebHistory } from "vue-router";
import ErrorsPage from "./errors/ErrorsPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: "/errors", component: ErrorsPage }],
});
