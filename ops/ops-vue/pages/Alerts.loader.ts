import { inject, ref, type InjectionKey } from "vue";
import { useListOpsAlerts } from "../requests/queries.ts";

export function useAlertsLoader() {
  const view = ref<{ all: boolean; since?: string }>({ all: false });
  return { view, alertsQuery: useListOpsAlerts(view) };
}

export type AlertsLoader = ReturnType<typeof useAlertsLoader>;

export const alertsLoaderKey: InjectionKey<AlertsLoader> = Symbol("opsAlertsLoader");

export function useAlertsPageLoader(): AlertsLoader {
  return inject(alertsLoaderKey, null) ?? useAlertsLoader();
}
