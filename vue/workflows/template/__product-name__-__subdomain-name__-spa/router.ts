import HomePage from "./pages/home-page/HomePageAsync.vue";
import { createRouter, createWebHistory } from "vue-router";

export const create__SubdomainName__Router = () => {
  const routes = [{ path: "/", component: HomePage }];
  return createRouter({
    history: createWebHistory("/"),
    routes,
  });
};
