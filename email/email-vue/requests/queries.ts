import { computed, type Ref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { handleClientMethod } from "@saflib/sdk";
import { getClient } from "../client.ts";

export function sentEmailsQueryOptions(userEmail: Ref<string>) {
  return {
    queryKey: computed(() => ["sent-emails", userEmail.value || "all"]),
    queryFn: async () => {
      const client = getClient();
      const q = userEmail.value.trim();
      return handleClientMethod(
        client.GET("/email/sent", {
          params: { query: { userEmail: q || undefined } },
        }),
      );
    },
  };
}

export function useSentEmailsQuery(userEmail: Ref<string>) {
  return useQuery(sentEmailsQueryOptions(userEmail));
}
