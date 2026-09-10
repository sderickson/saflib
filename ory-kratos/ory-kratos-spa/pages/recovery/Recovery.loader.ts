import { computed } from "vue";
import { useRoute } from "vue-router";
import { useGetRecoveryFlowQuery } from "@saflib/ory-kratos-sdk";

export function useRecoveryLoader() {
  const route = useRoute();
  const flowId = computed(() =>
    typeof route.query.flow === "string" ? route.query.flow : undefined,
  );
  return {
    getRecoveryFlowQuery: useGetRecoveryFlowQuery({
      flowId: flowId.value,
      enabled: computed(() => !!flowId.value),
    }),
  };
}
