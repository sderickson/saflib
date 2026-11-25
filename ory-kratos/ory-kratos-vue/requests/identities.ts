import { computed, toValue, type MaybeRefOrGetter } from "vue";
import { useQuery } from "@tanstack/vue-query";
import type { IdentitySummary } from "@saflib/ory-kratos-spec";
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
