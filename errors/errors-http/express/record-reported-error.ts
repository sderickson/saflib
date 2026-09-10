import { createHandler } from "./handler.ts";
import type { ErrorsRequestBody } from "@saflib/errors-spec";
import { getErrorService } from "@saflib/errors-service";

export function createRecordReportedErrorHandler() {
  return createHandler(async (req, res) => {
    const body = req.body as ErrorsRequestBody["recordReportedError"];
    const input = body.reported_error;
    getErrorService().recordReportedError({
      kind: "client",
      message: input.message,
      stack: input.stack,
      metadata: input.metadata,
      source: input.source ?? "client",
    });
    res.status(204).end();
  });
}
