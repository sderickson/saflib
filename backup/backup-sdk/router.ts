import {
  createWebHistory,
  createRouter,
  type RouteRecordRaw,
} from "vue-router";
import { StubComponent } from "@saflib/vue/components";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: StubComponent,
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
