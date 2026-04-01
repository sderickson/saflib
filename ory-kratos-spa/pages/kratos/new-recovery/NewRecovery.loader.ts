import { computed } from "vue";
import { useRoute } from "vue-router";
import { useCreateRecoveryFlowQuery } from "@saflib/ory-kratos-sdk";
import { useAuthPostAuthFallbackHref } from "../../../authFallbackInject.ts";

export function useNewRecoveryLoader() {
  const route = useRoute();
  const postAuthFallbackHref = useAuthPostAuthFallbackHref();
  const returnTo = computed(() => {
    if (typeof route.query.return_to === "string" && route.query.return_to.trim()) {
      return route.query.return_to.trim();
    }
    return postAuthFallbackHref.value;
  });

  return {
    createRecoveryFlowQuery: useCreateRecoveryFlowQuery({
      returnTo: returnTo.value,
    }),
  };
}
