import type { Router } from "express";
import { createJobsDemoRouter } from "./handlers/jobs-demo/index.ts";
import { createAdminRouter } from "./handlers/admin/index.ts";
import { createUserConfigsRouter } from "./handlers/user-configs/index.ts";

// BEGIN WORKFLOW AREA router-imports FOR express/add-handler


// END WORKFLOW AREA

export type GroupRouterMount = {
  kind: "router";
  createRouter: () => Router;
};

/**
 * Group routers owned by this http package.
 * `express/add-handler` upserts imports + mounts inside the workflow areas
 * (same contour in offshoots). Golden product routers stay outside those markers
 * so product/init keeps them when emptying foreign workflow areas.
 */
export function groupRouterMounts(): GroupRouterMount[] {
  return [
    // BEGIN WORKFLOW AREA router-mounts FOR express/add-handler


    // END WORKFLOW AREA
    { kind: "router", createRouter: createAdminRouter },
    { kind: "router", createRouter: createUserConfigsRouter },
    { kind: "router", createRouter: createJobsDemoRouter },
  ];
}
