import { inject, ref, type InjectionKey } from "vue";
import { useListOpsIssues, type IssueStatusFilter } from "../requests/queries.ts";

export function useIssuesLoader() {
  const statuses = ref<IssueStatusFilter[]>(["open", "regressed"]);
  return { statuses, issuesQuery: useListOpsIssues(statuses) };
}

export type IssuesLoader = ReturnType<typeof useIssuesLoader>;

export const issuesLoaderKey: InjectionKey<IssuesLoader> = Symbol("opsIssuesLoader");

export function useIssuesPageLoader(): IssuesLoader {
  return inject(issuesLoaderKey, null) ?? useIssuesLoader();
}
