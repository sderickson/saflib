import { createRouter, createMemoryHistory } from "vue-router";

export const router = createRouter({
  history: createMemoryHistory(),
  routes: [{ path: "/", component: { template: "<div />" } }],
});
