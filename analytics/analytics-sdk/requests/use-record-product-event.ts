import { useMutation } from "@tanstack/vue-query";
import type { AnalyticsRequestBody } from "@saflib/analytics-spec";
import { TanstackError } from "@saflib/sdk";
import { recordProductEvent } from "./record-product-event.ts";

export function useRecordProductEvent() {
  return useMutation<
    void,
    TanstackError,
    AnalyticsRequestBody["recordProductEvent"]
  >({
    mutationFn: (body) => recordProductEvent(body),
  });
}
