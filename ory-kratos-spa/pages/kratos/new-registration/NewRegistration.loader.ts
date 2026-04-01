import { computed } from "vue";
import { useRoute } from "vue-router";
import { useCreateRegistrationFlowQuery } from "@saflib/ory-kratos-sdk";
import { useAuthPostAuthFallbackHref } from "../../../authFallbackInject.ts";

export function useNewRegistrationLoader() {
  const route = useRoute();
  const postAuthFallbackHref = useAuthPostAuthFallbackHref();
  const returnTo = computed(() =>
    typeof route.query.return_to === "string"
      ? route.query.return_to
      : postAuthFallbackHref.value,
  );

  return {
    createRegistrationFlowQuery: useCreateRegistrationFlowQuery({
      returnTo: returnTo.value,
    }),
  };
}
