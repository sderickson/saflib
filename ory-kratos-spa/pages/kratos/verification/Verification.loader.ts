import { computed } from "vue";
import { useRoute } from "vue-router";
import { useGetVerificationFlowQuery } from "@saflib/ory-kratos-sdk";

export function useVerificationLoader() {
  const route = useRoute();
  const flowId = computed(() =>
    typeof route.query.flow === "string" ? route.query.flow : undefined,
  );
  return {
    getVerificationFlowQuery: useGetVerificationFlowQuery({
      flowId: flowId.value,
      enabled: computed(() => !!flowId.value),
    }),
  };
}
