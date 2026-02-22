import {
  createRouter,
  createWebHistory,
  type RouterHistory,
} from "vue-router";
import { __subdomainName__Links } from "template-package-links";
import { PageNotFound } from "@saflib/vue/components";

// TODO: remove this log once __subdomainName__Links is being used by the routes
console.log("__subdomainName__Links:", __subdomainName__Links);

// BEGIN SORTED WORKFLOW AREA page-imports FOR vue/add-view
import __FullName__Async from "./__group-name__/__TargetName__Async.vue";
// END WORKFLOW AREA

export const create__SubdomainName__Router = (options?: {
  history?: RouterHistory;
}) => {
  const routes = [
    // BEGIN WORKFLOW AREA page-routes FOR vue/add-view
    {
      path: __subdomainName__Links.__fullName__.path,
      component: __FullName__Async,
    },
    // END WORKFLOW AREA
    { path: "/:pathMatch(.*)*", component: PageNotFound },
  ];
  return createRouter({
    history: options?.history ?? createWebHistory("/"),
    routes,
  });
};
