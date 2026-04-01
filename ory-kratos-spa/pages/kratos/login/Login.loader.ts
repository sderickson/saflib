import { computed } from "vue";
import { useRoute } from "vue-router";
import { useGetLoginFlowQuery } from "@saflib/ory-kratos-sdk";

export function useLoginLoader() {
  const route = useRoute();
  const flowId = computed(() =>
    typeof route.query.flow === "string" ? route.query.flow : undefined,
  );
  return {
    getLoginFlowQuery: useGetLoginFlowQuery({
      flowId: flowId.value,
    }),
  };
}
