import { computed, type Ref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { useRoute } from "vue-router";
import { handleClientMethod } from "@saflib/sdk";
import {
  kratosEmailFromSession,
  useKratosSession,
} from "@saflib/ory-kratos-sdk";
import { getClient } from "../../client.ts";

export const getSentEmails = (userEmail: Ref<string>) => {
  return {
    queryKey: computed(() => ["sent-emails", userEmail.value]),
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
};

export function useLastMockEmailPageLoader() {
  const route = useRoute();
  const { data: session, status: sessionStatus } = useKratosSession();

  const userEmail = computed(() => {
    const q = route.query.userEmail;
    if (typeof q === "string" && q.trim()) {
      return q.trim();
    }
    return kratosEmailFromSession(session.value) ?? "";
  });

  const sentEmailsEnabled = computed(() => {
    const explicitUserEmail =
      typeof route.query.userEmail === "string" &&
      route.query.userEmail.trim().length > 0;
    if (explicitUserEmail) {
      return true;
    }
    return (
      sessionStatus.value === "success" &&
      !!kratosEmailFromSession(session.value)
    );
  });

  return {
    sentEmailsQuery: useQuery({
      ...getSentEmails(userEmail),
      enabled: sentEmailsEnabled,
    }),
  };
}
