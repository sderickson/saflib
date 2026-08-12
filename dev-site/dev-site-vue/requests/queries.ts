import { useQuery, useMutation, useQueryClient } from "@tanstack/vue-query";
import type { MaybeRefOrGetter } from "vue";
import { toValue } from "vue";
import type {
  paths,
  DevSiteResponseBody,
  DevSiteRequestBody,
} from "@saflib/dev-site-spec";
import { TanstackError, handleClientMethod, createSafClient } from "@saflib/sdk";

export function useCommits(
  subdomain: string,
  params: MaybeRefOrGetter<{ cursor?: string; limit?: number }> = {},
) {
  const client = createSafClient<paths>(subdomain);
  return useQuery<DevSiteResponseBody["listCommits"][200], TanstackError>({
    queryKey: ["dev-site", "commits", params],
    queryFn: () => {
      const p = toValue(params);
      return handleClientMethod(
        client.GET("/commits", {
          params: {
            query: {
              cursor: p.cursor,
              limit: p.limit,
            },
          },
        }),
      );
    },
  });
}

export function useCommit(
  subdomain: string,
  hash: MaybeRefOrGetter<string>,
) {
  const client = createSafClient<paths>(subdomain);
  return useQuery<DevSiteResponseBody["getCommits"][200], TanstackError>({
    queryKey: ["dev-site", "commit", hash],
    enabled: () => Boolean(toValue(hash)),
    queryFn: () => {
      return handleClientMethod(
        client.GET("/commits/{hash}", {
          params: { path: { hash: toValue(hash) } },
        }),
      );
    },
  });
}

export function useCommitDiff(
  subdomain: string,
  fromHash: MaybeRefOrGetter<string>,
  toHash: MaybeRefOrGetter<string>,
) {
  const client = createSafClient<paths>(subdomain);
  return useQuery<DevSiteResponseBody["diffCommits"][200], TanstackError>({
    queryKey: ["dev-site", "diff", fromHash, toHash],
    enabled: () => Boolean(toValue(fromHash) && toValue(toHash)),
    queryFn: () => {
      return handleClientMethod(
        client.GET("/commits/{hash}/diff/{otherHash}", {
          params: {
            path: {
              hash: toValue(fromHash),
              otherHash: toValue(toHash),
            },
          },
        }),
      );
    },
  });
}

export function useScanMutation(subdomain: string) {
  const client = createSafClient<paths>(subdomain);
  const queryClient = useQueryClient();
  return useMutation<
    DevSiteResponseBody["executeScan"][200],
    TanstackError,
    DevSiteRequestBody["executeScan"]
  >({
    mutationFn: (body) => {
      return handleClientMethod(client.POST("/scan", { body: body ?? {} }));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dev-site", "commits"] });
    },
  });
}
