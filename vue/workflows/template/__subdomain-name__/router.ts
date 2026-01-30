import { createRouter, createWebHistory } from "vue-router";
import { __subdomainName__Links } from "template-package-links";
import { PageNotFound } from "@saflib/vue/components";

// TODO: remove this log once __subdomainName__Links is being used by the routes
console.log("__subdomainName__Links:", __subdomainName__Links);

// BEGIN SORTED WORKFLOW AREA page-imports FOR vue/add-page
import __TargetName__Async from "./pages/__full-path__/__TargetName__PageAsync.vue";
// END WORKFLOW AREA

export const create__SubdomainName__Router = () => {
  const routes = [
    // BEGIN WORKFLOW AREA page-routes FOR vue/add-page
    {
      path: __subdomainName__Links.__target_name__.path,
      component: __TargetName__Async,
    },
    // END WORKFLOW AREA
    { path: "/:pathMatch(.*)*", component: PageNotFound },
  ];
  return createRouter({
    history: createWebHistory("/"),
    routes,
  });
};
