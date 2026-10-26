import { createHandler } from "@saflib/express";
import type { ResponseBody } from "@saflib/dev-site-spec/operations/listScanJobs";
import { getDevSiteHttpContext } from "../../context.ts";
import { listScanJobs } from "../../scan-dispatch.ts";
import { toApiScanJob } from "./wire.ts";

export const listScanJobsHandler = createHandler(async (_req, res) => {
  const { dbKey } = getDevSiteHttpContext();
  const response: ResponseBody["listScanJobs"][200] = {
    scan_jobs: listScanJobs(dbKey).map(toApiScanJob),
  };
  res.status(200).json(response);
});
