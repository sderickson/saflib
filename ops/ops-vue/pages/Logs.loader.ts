import { inject, ref, type InjectionKey } from "vue";
import { useListAdminLogs, useListLogGroups, type AdminLogFilters } from "../requests/queries.ts";

export function useLogsLoader() {
  const filters = ref<AdminLogFilters>({});
  const live = ref(false);
  return {
    filters,
    live,
    logsQuery: useListAdminLogs(filters, live),
    groupsQuery: useListLogGroups(filters, live),
  };
}

export type LogsLoader = ReturnType<typeof useLogsLoader>;

export const logsLoaderKey: InjectionKey<LogsLoader> = Symbol("opsLogsLoader");

export function useLogsPageLoader(): LogsLoader {
  return inject(logsLoaderKey, null) ?? useLogsLoader();
}
