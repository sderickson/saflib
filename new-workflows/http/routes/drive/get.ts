import { createHandler } from "@saflib/express";
import type { NewWorkflowsResponseBody } from "@saflib/new-workflows-spec";
import { newWorkflowsHttpStorage } from "../../context.ts";
import { getRunDriver } from "../../run-driver.ts";

export const getWorkflowDriveHandler = createHandler(async (_req, res) => {
  const ctx = newWorkflowsHttpStorage.getStore()!;
  const drive = getRunDriver(ctx.dbKey).state;
  const response: NewWorkflowsResponseBody["getWorkflowDrive"][200] = drive ? { drive } : {};
  res.status(200).json(response);
});
