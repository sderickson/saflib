import {
  createWebHistory,
  createRouter,
  type RouteRecordRaw,
} from "vue-router";
import SecretManager from "./pages/secret-manager/SecretManager.vue";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: SecretManager,
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
