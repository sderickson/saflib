import { inject, ref, type InjectionKey } from "vue";
import { useListAdminLogs, type AdminLogFilters } from "../requests/queries.ts";

export function useLogsLoader() {
  const filters = ref<AdminLogFilters>({});
  return { filters, logsQuery: useListAdminLogs(filters) };
}

export type LogsLoader = ReturnType<typeof useLogsLoader>;

export const logsLoaderKey: InjectionKey<LogsLoader> = Symbol("opsLogsLoader");

export function useLogsPageLoader(): LogsLoader {
  return inject(logsLoaderKey, null) ?? useLogsLoader();
}
