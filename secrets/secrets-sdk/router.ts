import {
  createWebHistory,
  createRouter,
  type RouteRecordRaw,
} from "vue-router";
import { SecretsTable } from "./components";
import { secretStubs } from "./requests/secrets/list.fake";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    component: SecretsTable,
    name: "secrets-table",
    props: {
      loading: false,
      error: null,
      secrets: secretStubs,
    },
  },
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
});
