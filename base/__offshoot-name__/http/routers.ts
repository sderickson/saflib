// @ts-nocheck — scaffold placeholders until express/add-handler copies handlers here.
import type { Router } from "express";

// BEGIN WORKFLOW AREA router-imports FOR express/add-handler
import { create__GroupName__Router } from "./handlers/__group-name__/index.ts";
// END WORKFLOW AREA

export type GroupRouterMount = {
  kind: "router";
  createRouter: () => Router;
};

/**
 * Group routers owned by this offshoot http package.
 * Same contour as `service/http/routers.ts` — `express/add-handler` upserts here.
 */
export function groupRouterMounts(): GroupRouterMount[] {
  return [
    // BEGIN WORKFLOW AREA router-mounts FOR express/add-handler
    { kind: "router", createRouter: create__GroupName__Router },
    // END WORKFLOW AREA
  ];
}
