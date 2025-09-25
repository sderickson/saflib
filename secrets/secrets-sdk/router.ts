import {
  createWebHistory,
  createRouter,
  type RouteRecordRaw,
} from "vue-router";
import SecretManagerAsync from "./pages/secret-manager/SecretManagerAsync.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: SecretManagerAsync,
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
