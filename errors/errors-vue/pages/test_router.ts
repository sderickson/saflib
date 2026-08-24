import { createRouter, createWebHistory } from "vue-router";
import ErrorsPage from "./ErrorsPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: "/errors", component: ErrorsPage }],
});
