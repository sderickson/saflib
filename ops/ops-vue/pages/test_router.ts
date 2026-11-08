import { createRouter, createWebHistory } from "vue-router";
import OpsTokensAsync from "./OpsTokensAsync.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/ops/tokens", component: OpsTokensAsync },
    { path: "/", redirect: "/ops/tokens" },
  ],
});
