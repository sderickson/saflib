import { createHandler } from "@saflib/express";
import type { NewWorkflowsResponseBody } from "@saflib/new-workflows-spec";
import { newWorkflowsHttpStorage } from "../../context.ts";
import { getRunDriver } from "../../run-driver.ts";

export const stopWorkflowDriveHandler = createHandler(async (_req, res) => {
  const ctx = newWorkflowsHttpStorage.getStore()!;
  const drive = await getRunDriver(ctx.dbKey).stop(ctx.dbKey);
  const response: NewWorkflowsResponseBody["stopWorkflowDrive"][200] = drive ? { drive } : {};
  res.status(200).json(response);
});
