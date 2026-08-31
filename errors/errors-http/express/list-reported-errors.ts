import createError from "http-errors";
import { createHandler } from "./handler.ts";
import type { ErrorsResponseBody } from "@saflib/errors-spec";
import { listReportedErrors, type ReportedErrorKind } from "../lib/reportedErrorBuffer.ts";

const REPORTED_ERROR_KINDS = new Set<ReportedErrorKind>([
  "csp-violation",
  "client",
  "server",
  "test",
]);

export function createListReportedErrorsHandler() {
  return createHandler(async (req, res) => {
    const kindRaw =
      typeof req.query.kind === "string" ? req.query.kind : undefined;
    let kind: ReportedErrorKind | undefined;
    if (kindRaw !== undefined) {
      if (!REPORTED_ERROR_KINDS.has(kindRaw as ReportedErrorKind)) {
        throw createError(400, "Invalid kind");
      }
      kind = kindRaw as ReportedErrorKind;
    }

    const source =
      typeof req.query.source === "string" ? req.query.source : undefined;
    const limitRaw =
      typeof req.query.limit === "string" ? req.query.limit : undefined;
    let limit: number | undefined;
    if (limitRaw !== undefined) {
      limit = Number(limitRaw);
      if (!Number.isFinite(limit) || limit < 1) {
        throw createError(400, "Invalid limit");
      }
    }

    const reported_errors = listReportedErrors({ kind, source, limit });
    res
      .status(200)
      .json({ reported_errors } satisfies ErrorsResponseBody["listReportedErrors"][200]);
  });
}
