import { computed } from "vue";
import { useQuery } from "@tanstack/vue-query";
import { useRoute } from "vue-router";
import {
  kratosEmailFromSession,
  useKratosSession,
} from "@saflib/ory-kratos-sdk";
import { sentEmailsQueryOptions } from "../../requests/queries.ts";

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
      ...sentEmailsQueryOptions(userEmail),
      enabled: sentEmailsEnabled,
    }),
  };
}
