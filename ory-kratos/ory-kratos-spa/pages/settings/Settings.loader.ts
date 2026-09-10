import { computed } from "vue";
import { useRoute } from "vue-router";
import { useGetSettingsFlowQuery } from "@saflib/ory-kratos-sdk";

export function useSettingsLoader() {
  const route = useRoute();
  const flowId = computed(() =>
    typeof route.query.flow === "string" ? route.query.flow : undefined,
  );
  return {
    getSettingsFlowQuery: useGetSettingsFlowQuery({
      flowId: flowId.value,
      enabled: computed(() => !!flowId.value),
    }),
  };
}
