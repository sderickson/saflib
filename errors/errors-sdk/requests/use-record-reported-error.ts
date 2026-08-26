import { useMutation } from "@tanstack/vue-query";
import type { ErrorsRequestBody } from "@saflib/errors-spec";
import { TanstackError } from "@saflib/sdk";
import { recordReportedError } from "./record-reported-error.ts";

export function useRecordReportedError() {
  return useMutation<
    void,
    TanstackError,
    ErrorsRequestBody["recordReportedError"]
  >({
    mutationFn: (body) => recordReportedError(body),
  });
}
