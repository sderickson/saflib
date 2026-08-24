import type { Router } from "express";

// BEGIN WORKFLOW AREA router-imports FOR express/add-handler
import { create__GroupName__Router } from "./handlers/__group-name__/index.ts";
// END WORKFLOW AREA

export type GroupRouterMount = {
  kind: "router";
  createRouter: () => Router;
};

/**
 * Group routers owned by this http package.
 * `express/add-handler` upserts imports + mounts here (same contour in offshoots).
 */
export function groupRouterMounts(): GroupRouterMount[] {
  return [
    // BEGIN WORKFLOW AREA router-mounts FOR express/add-handler
    { kind: "router", createRouter: create__GroupName__Router },
    // END WORKFLOW AREA
  ];
}
