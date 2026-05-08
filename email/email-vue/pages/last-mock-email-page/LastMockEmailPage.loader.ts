import { computed, type Ref } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { useRoute } from "vue-router";
import { handleClientMethod } from "@saflib/sdk";
import { createSafClient } from "@saflib/sdk";
import type { paths as emailPaths } from "@saflib/email-spec";
import {
  kratosEmailFromSession,
  useKratosSession,
} from "@saflib/ory-kratos-sdk";

export const getSentEmails = (
  subdomain: Ref<string>,
  userEmail: Ref<string>,
) => {
  return {
    queryKey: computed(() => [
      "sent-emails",
      subdomain.value,
      userEmail.value,
    ]),
    queryFn: async () => {
      const client = createSafClient<emailPaths>(subdomain.value);
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

  const subdomain = computed(() => {
    const q = route.query.subdomain;
    if (typeof q === "string" && q.trim()) {
      return q.trim();
    }
    return "api";
  });

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
      ...getSentEmails(subdomain, userEmail),
      enabled: sentEmailsEnabled,
    }),
  };
}
