import { createHandler } from "@saflib/express";
import type {
  ResponseBody,
  RequestBody,
} from "@saflib/dev-site-spec/operations/executeScan";
import createError from "http-errors";
import { GitCommandError } from "@saflib/git";
import { getDevSiteHttpContext } from "../../context.ts";
import {
  DEFAULT_HTTP_SCAN_LIMIT,
  dispatchScan,
} from "../../scan-dispatch.ts";

export const executeScanHandler = createHandler(async (req, res) => {
  const { dbKey, repoRoot, productRoot, mainRef, dbPath } =
    getDevSiteHttpContext();
  const body = (req.body ?? {}) as NonNullable<RequestBody["executeScan"]>;
  const { result, error } = await dispatchScan(dbKey, {
    repoRoot,
    productRoot,
    mainRef,
    dbPath,
    limit: body.commitHash ? undefined : (body.limit ?? DEFAULT_HTTP_SCAN_LIMIT),
    commitHash: body.commitHash,
  });
  if (error) {
    switch (true) {
      case error instanceof GitCommandError:
        throw createError(500, error.message, { code: "GIT_COMMAND_FAILED" });
      default:
        throw error satisfies never;
    }
  }
  if (result.failed.length > 0) {
    const first = result.failed[0]!;
    const detail =
      result.failed.length === 1
        ? `${first.hash.slice(0, 10)}: ${first.message}`
        : `${result.failed.length} commits (first ${first.hash.slice(0, 10)}: ${first.message})`;
    throw createError(500, `Scan failed for ${detail}`, {
      code: "SCAN_FAILED",
    });
  }
  const response: ResponseBody["executeScan"][200] = result;
  res.status(200).json(response);
});
