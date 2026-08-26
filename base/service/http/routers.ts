import type { Router } from "express";
import { createJobsDemoRouter } from "./handlers/jobs-demo/index.ts";

// BEGIN WORKFLOW AREA router-imports FOR express/add-handler
import { createAdminRouter } from "./handlers/admin/index.ts";
import { createUserConfigsRouter } from "./handlers/user-configs/index.ts";
// END WORKFLOW AREA

export type GroupRouterMount = {
  kind: "router";
  createRouter: () => Router;
};

/**
 * Group routers owned by this http package.
 * `express/add-handler` upserts imports + mounts inside the workflow areas
 * (same contour in offshoots). Static demos stay outside those markers.
 */
export function groupRouterMounts(): GroupRouterMount[] {
  return [
    // BEGIN WORKFLOW AREA router-mounts FOR express/add-handler
    { kind: "router", createRouter: createAdminRouter },
    { kind: "router", createRouter: createUserConfigsRouter },
    // END WORKFLOW AREA
    { kind: "router", createRouter: createJobsDemoRouter },
  ];
}
