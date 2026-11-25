import { computed, inject, type InjectionKey } from "vue";
import { useRoute } from "vue-router";
import { useListOpsAlerts } from "../requests/queries.ts";

export type AlertsTab = "firing" | "recent";

const HOUR_MS = 3_600_000;

/**
 * The tab lives in the URL (`?view=recent`) so it survives AsyncPage
 * remounting the page while the new list loads, and so links and Back work.
 */
export function useAlertsLoader() {
  const route = useRoute();
  const tab = computed<AlertsTab>(() => (route.query.view === "recent" ? "recent" : "firing"));
  const view = computed(() =>
    tab.value === "recent"
      ? // Whole hours, so the query key (and cache) holds still across remounts.
        { all: true, since: new Date(Math.floor(Date.now() / HOUR_MS) * HOUR_MS - 7 * 24 * HOUR_MS).toISOString() }
      : { all: false },
  );
  return { tab, view, alertsQuery: useListOpsAlerts(view) };
}
export type AlertsLoader = ReturnType<typeof useAlertsLoader>;

export const alertsLoaderKey: InjectionKey<AlertsLoader> = Symbol("opsAlertsLoader");

export function useAlertsPageLoader(): AlertsLoader {
  return inject(alertsLoaderKey, null) ?? useAlertsLoader();
}
