import { useListSecrets } from "../../requests/secrets/list.ts";
import { useListAccessRequests } from "../../requests/access-requests/list.ts";
import { useListServiceTokens } from "../../requests/service-tokens/list.ts";
import { ref } from "vue";

export function useSecretManagerLoader() {
  // Hard-code limit to 100 and warn if there are more
  const limit = ref(100);
  const offset = ref(0);

  return {
    secretsQuery: useListSecrets({
      limit,
      offset,
    }),
    accessRequestsQuery: useListAccessRequests({
      limit,
      offset, // Only show pending requests
    }),
    serviceTokensQuery: useListServiceTokens({
      limit,
      offset,
    }),
  };
}
