import { getProfile } from "@saflib/auth";
import { computed, type Ref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { useRoute } from "vue-router";
import { handleClientMethod } from "@saflib/sdk";
import { createSafClient } from "@saflib/sdk";
import type { paths as emailPaths } from "@saflib/email-spec";

export const getSentEmails = (
  subdomain: string,
  email?: Ref<string | undefined>,
) => {
  const client = createSafClient<emailPaths>(subdomain);
  return {
    queryKey: ["sent-emails", "auth", email],
    queryFn: async () => {
      return handleClientMethod(
        client.GET("/email/sent", {
          params: { query: { userEmail: email?.value } },
        }),
      );
    },
  };
};

export function useLastMockEmailPageLoader() {
  const route = useRoute();
  const subdomain = route.query.subdomain as string;
  if (!subdomain) {
    console.log("subdomain is required", route.query);
    throw new Error("Subdomain query param is required");
  }

  const profileQuery = useQuery(getProfile());
  const email = computed(() => profileQuery.data.value?.email);
  const emailLoaded = computed(() => profileQuery.isSuccess.value);

  return {
    profileQuery,
    sentEmailsQuery: useQuery({
      ...getSentEmails(subdomain, email),
      enabled: emailLoaded,
    }),
  };
}
