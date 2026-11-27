import { computed, toValue, type MaybeRefOrGetter } from "vue";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/vue-query";
import type { IdentitySummary, KratosAdminResponseBody } from "@saflib/ory-kratos-spec";
import { handleClientMethod, TanstackError } from "@saflib/sdk";
import { getClient } from "../client.ts";
import { createIdentityBatcher, isKratosId } from "../lib/identity-batcher.ts";

let loader: ReturnType<typeof createIdentityBatcher> | null = null;

function getLoader() {
  if (!loader) {
    loader = createIdentityBatcher(async (ids) => {
      const body = await handleClientMethod(
        getClient().POST("/admin/identities/lookup", { body: { ids } }),
      );
      return body.identities;
    });
  }
  return loader;
}

/** Test-only: forget the batcher so a new client/mock server is used. */
export function resetIdentityLoaderForTests() {
  loader = null;
}

/**
 * The identity for a user id, looked up in batches and cached per id.
 * `identity` is `null` once loaded when no such identity exists.
 */
export function useIdentity(id: MaybeRefOrGetter<string | null | undefined>) {
  const resolved = computed(() => toValue(id) ?? "");
  const query = useQuery<IdentitySummary | null, TanstackError>({
    queryKey: ["identity", resolved],
    queryFn: () => getLoader()(resolved.value),
    enabled: computed(() => isKratosId(resolved.value)),
    staleTime: 5 * 60_000,
  });
  return {
    query,
    identity: computed(() => query.data.value),
    isPerson: computed(() => isKratosId(resolved.value)),
    loading: computed(() => query.isPending.value && isKratosId(resolved.value)),
    notFound: computed(() => query.isSuccess.value && query.data.value === null),
  };
}

type ListPage = KratosAdminResponseBody["listIdentitiesAdmin"][200];

/** Users page list: search results a page at a time. Primes the per-id cache. */
export function useListIdentities(q: MaybeRefOrGetter<string>) {
  const queryClient = useQueryClient();
  return useInfiniteQuery<
    ListPage,
    TanstackError,
    InfiniteData<ListPage, string | undefined>,
    readonly unknown[],
    string | undefined
  >({
    queryKey: computed(() => ["identities", "list", toValue(q)] as const),
    initialPageParam: undefined,
    queryFn: async ({ pageParam }) => {
      const search = toValue(q).trim();
      const page = await handleClientMethod(
        getClient().GET("/admin/identities", {
          params: {
            query: {
              limit: 50,
              ...(search ? { q: search } : {}),
              ...(pageParam ? { cursor: pageParam } : {}),
            },
          },
        }),
      );
      // UserRefs in the list then render without their own lookups.
      for (const record of page.identities) {
        queryClient.setQueryData(["identity", record.id], record);
      }
      return page;
    },
    getNextPageParam: (last) => last.next_cursor ?? undefined,
  });
}

/** One identity for the Users detail panel. */
export function useGetIdentityAdmin(id: MaybeRefOrGetter<string | null | undefined>) {
  const resolved = computed(() => toValue(id) ?? "");
  return useQuery<KratosAdminResponseBody["getIdentityAdmin"][200], TanstackError>({
    queryKey: ["identities", "get", resolved],
    enabled: computed(() => resolved.value.length > 0),
    queryFn: () =>
      handleClientMethod(
        getClient().GET("/admin/identities/{id}", {
          params: { path: { id: resolved.value } },
        }),
      ),
  });
}
