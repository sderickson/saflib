import { createRouter, createWebHistory } from "vue-router";
import ErrorSmokeWidgets from "./ErrorSmokeWidgets.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: "/", component: ErrorSmokeWidgets }],
});
