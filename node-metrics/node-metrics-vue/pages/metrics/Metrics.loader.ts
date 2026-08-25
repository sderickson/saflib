import { inject, type InjectionKey } from "vue";
import { useGetMetricsSnapshot } from "@saflib/node-metrics-sdk";

export function useMetricsLoader() {
  return {
    metricsQuery: useGetMetricsSnapshot(),
  };
}

export type MetricsLoader = ReturnType<typeof useMetricsLoader>;

export const metricsLoaderKey: InjectionKey<MetricsLoader> =
  Symbol("metricsLoader");

export function useMetricsPageLoader(): MetricsLoader {
  return inject(metricsLoaderKey, null) ?? useMetricsLoader();
}
