import { computed } from "vue";
import { useRoute } from "vue-router";
import { useCreateVerificationFlowQuery } from "@saflib/ory-kratos-sdk";
import { useAuthPostAuthFallbackHref } from "../../../authFallbackInject.ts";

export function useNewVerificationLoader() {
  const route = useRoute();
  const postAuthFallbackHref = useAuthPostAuthFallbackHref();
  const returnTo = computed(() => {
    if (typeof route.query.return_to === "string" && route.query.return_to.trim()) {
      return route.query.return_to.trim();
    }
    return postAuthFallbackHref.value;
  });

  return {
    createVerificationFlowQuery: useCreateVerificationFlowQuery({
      returnTo: returnTo.value,
    }),
  };
}
