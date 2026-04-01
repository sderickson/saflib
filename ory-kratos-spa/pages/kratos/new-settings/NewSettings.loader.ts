import { computed } from "vue";
import { useRoute } from "vue-router";
import { useCreateSettingsFlowQuery } from "@saflib/ory-kratos-sdk";
import { useAuthPostAuthFallbackHref } from "../../../authFallbackInject.ts";

export function useNewSettingsLoader() {
  const route = useRoute();
  const postAuthFallbackHref = useAuthPostAuthFallbackHref();
  const returnTo = computed(() => {
    if (typeof route.query.return_to === "string" && route.query.return_to.trim()) {
      return route.query.return_to.trim();
    }
    return postAuthFallbackHref.value;
  });

  return {
    createSettingsFlowQuery: useCreateSettingsFlowQuery({
      returnTo: returnTo.value,
    }),
  };
}
