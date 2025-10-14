import {
  createWebHistory,
  createRouter,
  type RouteRecordRaw,
} from "vue-router";
import AccountPasswordPageAsync from "./pages/account-password/AccountPasswordPageAsync.vue";
import AccountProfilePageAsync from "./pages/account-profile/AccountProfilePageAsync.vue";
import { StubComponent } from "@saflib/vue/components";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: StubComponent,
  },
  {
    path: "/password",
    component: AccountPasswordPageAsync,
  },
  {
    path: "/profile",
    component: AccountProfilePageAsync,
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
