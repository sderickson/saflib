import { useQuery } from "@tanstack/vue-query";
import type { Ref } from "vue";
import { computed, unref } from "vue";
import type {
  ErrorsResponseBody,
  ReportedError,
  paths,
} from "@saflib/errors-spec";
import { TanstackError, createSafClient, handleClientMethod } from "@saflib/sdk";

export type ReportedErrorKind = ReportedError["kind"];

export interface UseListReportedErrorsOptions {
  kind?: Ref<ReportedErrorKind | undefined>;
  source?: Ref<string | undefined>;
  limit?: Ref<number | undefined>;
}

export function useListReportedErrors(
  subdomain: string,
  options: UseListReportedErrorsOptions = {},
) {
  const client = createSafClient<paths>(subdomain);
  return useQuery<ErrorsResponseBody["listReportedErrors"][200], TanstackError>({
    queryKey: computed(() => [
      "reported-errors",
      "list",
      unref(options.kind),
      unref(options.source),
      unref(options.limit),
    ]),
    queryFn: () => {
      const kind = unref(options.kind);
      const source = unref(options.source);
      const limit = unref(options.limit);
      return handleClientMethod(
        client.GET("/admin/errors", {
          params: {
            query: {
              ...(kind !== undefined ? { kind } : {}),
              ...(source !== undefined && source !== "" ? { source } : {}),
              ...(limit !== undefined ? { limit } : {}),
            },
          },
        }),
      );
    },
  });
}
