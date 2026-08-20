import type { RouterHistory } from "vue-router";
import { createKratosAuthRouter } from "@saflib/ory-kratos-spa/router";

// BEGIN WORKFLOW AREA page-imports FOR vue/add-view

// END WORKFLOW AREA

export const createAuthRouter = (options?: { history?: RouterHistory }) => {
  return createKratosAuthRouter({
    history: options?.history,
    additionalRoutes: [
      // BEGIN WORKFLOW AREA page-routes FOR vue/add-view

      // END WORKFLOW AREA
    ],
  });
};
