// @ts-nocheck — scaffold until express/add-handler copies handlers here.
import type { Router } from "express";

// Empty markers — express/add-handler upserts from service/http/routers.ts.
// BEGIN WORKFLOW AREA router-imports FOR express/add-handler
// END WORKFLOW AREA

export type GroupRouterMount = {
  kind: "router";
  createRouter: () => Router;
};

/**
 * Group routers owned by this offshoot http package.
 * Same area names as service/http/routers.ts so add-handler can upsert.
 */
export function groupRouterMounts(): GroupRouterMount[] {
  return [
    // BEGIN WORKFLOW AREA router-mounts FOR express/add-handler
    // END WORKFLOW AREA
  ];
}
