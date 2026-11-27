import { createHandler } from "./handler.ts";
import type { ErrorsRequestBody } from "@saflib/errors-spec";
import { reportError } from "@saflib/errors-service";
import { isDevelopmentDeployment } from "@saflib/env";

/**
 * A lazily loaded chunk failed to load: Firefox, Chrome and Safari wording.
 * In development that's Vite re-bundling dependencies or restarting while a
 * tab is open, so it's dropped there. In production it means a tab from
 * before a deploy asked for a chunk that's gone, which is worth seeing.
 */
const DYNAMIC_IMPORT_FAILED =
  /error loading dynamically imported module|failed to fetch dynamically imported module|importing a module script failed/i;

/** Client reports that are noise in this environment. */
export function isIgnoredClientError(message: string, development = isDevelopmentDeployment()): boolean {
  return development && DYNAMIC_IMPORT_FAILED.test(message);
}

export function createRecordReportedErrorHandler() {
  return createHandler(async (req, res) => {
    const body = req.body as ErrorsRequestBody["recordReportedError"];
    const input = body.reported_error;
    if (!isIgnoredClientError(input.message)) {
      reportError({
        kind: "client",
        message: input.message,
        stack: input.stack,
        metadata: input.metadata,
        source: input.source ?? "client",
      });
    }
    res.status(204).end();
  });
}
