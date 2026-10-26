import { createHandler } from "@saflib/express";
import type {
  ResponseBody,
  RequestBody,
} from "@saflib/dev-site-spec/operations/executeScan";
import { getDevSiteHttpContext } from "../../context.ts";
import { enqueueScan } from "../../scan-dispatch.ts";
import { toApiScanJob } from "./wire.ts";

export const executeScanHandler = createHandler(async (req, res) => {
  const { dbKey, repo_root, product_root, mainRef, dbPath } =
    getDevSiteHttpContext();
  const body = (req.body ?? {}) as NonNullable<RequestBody["executeScan"]>;
  const job = enqueueScan(dbKey, {
    repo_root,
    product_root,
    mainRef,
    dbPath,
    limit: body.limit,
    commit_hash: body.commit_hash,
  });
  const response: ResponseBody["executeScan"][202] = {
    scan_job: toApiScanJob(job),
  };
  res.status(202).json(response);
});
