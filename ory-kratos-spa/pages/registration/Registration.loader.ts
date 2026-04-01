import { computed } from "vue";
import { useRoute } from "vue-router";
import { useGetRegistrationFlowQuery } from "@saflib/ory-kratos-sdk";

export function useRegistrationLoader() {
  const route = useRoute();
  const flowId = computed(() =>
    typeof route.query.flow === "string" ? route.query.flow : undefined,
  );
  return {
    getRegistrationFlowQuery: useGetRegistrationFlowQuery({
      flowId: flowId.value,
    }),
  };
}
