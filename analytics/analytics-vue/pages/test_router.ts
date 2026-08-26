import { createRouter, createWebHistory } from "vue-router";
import ProductEventsPage from "./product-events/ProductEventsPage.vue";

export const router = createRouter({
  history: createWebHistory(),
  routes: [{ path: "/events", component: ProductEventsPage }],
});
