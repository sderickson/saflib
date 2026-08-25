import { inject, ref, type InjectionKey } from "vue";
import { useSentEmailsQuery } from "../../requests/queries.ts";

export function useSentEmailsLoader() {
  const userEmailFilter = ref("");

  return {
    userEmailFilter,
    sentEmailsQuery: useSentEmailsQuery(userEmailFilter),
  };
}

export type SentEmailsLoader = ReturnType<typeof useSentEmailsLoader>;

export const sentEmailsLoaderKey: InjectionKey<SentEmailsLoader> =
  Symbol("sentEmailsLoader");

export function useSentEmailsPageLoader(): SentEmailsLoader {
  return inject(sentEmailsLoaderKey, null) ?? useSentEmailsLoader();
}
