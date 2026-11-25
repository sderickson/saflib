import { computed, inject, type InjectionKey } from "vue";
import { useRoute } from "vue-router";
import { useListOpsIssues, type IssueStatusFilter } from "../requests/queries.ts";

export const ISSUE_TABS = {
  active: ["open", "regressed"],
  resolved: ["resolved"],
  ignored: ["ignored"],
} satisfies Record<string, IssueStatusFilter[]>;

export type IssueTab = keyof typeof ISSUE_TABS;

const isIssueTab = (v: unknown): v is IssueTab => typeof v === "string" && v in ISSUE_TABS;

/**
 * The tab lives in the URL (`?status=resolved`) so it survives AsyncPage
 * remounting the page while the new list loads, and so links and Back work.
 */
export function useIssuesLoader() {
  const route = useRoute();
  const tab = computed<IssueTab>(() => (isIssueTab(route.query.status) ? route.query.status : "active"));
  const statuses = computed<IssueStatusFilter[]>(() => ISSUE_TABS[tab.value]);
  return { tab, statuses, issuesQuery: useListOpsIssues(statuses) };
}
export type IssuesLoader = ReturnType<typeof useIssuesLoader>;

export const issuesLoaderKey: InjectionKey<IssuesLoader> = Symbol("opsIssuesLoader");

export function useIssuesPageLoader(): IssuesLoader {
  return inject(issuesLoaderKey, null) ?? useIssuesLoader();
}
