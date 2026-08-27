import type { RouterHistory } from "vue-router";
import { createKratosAuthRouter } from "@saflib/ory-kratos-spa/router";
import { kratosSessionRouteRecords } from "@saflib/ory-kratos-spa/session-routes";

// BEGIN WORKFLOW AREA page-imports FOR vue/add-view

// END WORKFLOW AREA

export const createAuthRouter = (options?: { history?: RouterHistory }) => {
  return createKratosAuthRouter({
    history: options?.history,
    additionalRoutes: [
      // Settings / verify-wall on auth (security suite + recovery continue).
      ...kratosSessionRouteRecords(),
      // BEGIN WORKFLOW AREA page-routes FOR vue/add-view

      // END WORKFLOW AREA
    ],
  });
};
