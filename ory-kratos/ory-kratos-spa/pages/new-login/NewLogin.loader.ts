import { computed } from "vue";
import { useRoute } from "vue-router";
import { useCreateLoginFlowQuery } from "@saflib/ory-kratos-sdk";
import { useAuthPostAuthFallbackHref } from "../../authFallbackInject.ts";

export function useNewLoginLoader() {
  const route = useRoute();
  const postAuthFallbackHref = useAuthPostAuthFallbackHref();
  const returnTo = computed(() =>
    typeof route.query.return_to === "string"
      ? route.query.return_to
      : postAuthFallbackHref.value,
  );

  const aal =
    typeof route.query.aal === "string" && route.query.aal.trim()
      ? route.query.aal.trim()
      : undefined;

  return {
    createLoginFlowQuery: useCreateLoginFlowQuery({
      returnTo: returnTo.value,
      aal,
    }),
  };
}
