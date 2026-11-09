import { inject, type InjectionKey } from "vue";
import {
  useCreateOpsToken,
  useListOpsTokens,
  useRevokeOpsToken,
} from "../requests/queries.ts";

export function useOpsTokensLoader() {
  return {
    tokensQuery: useListOpsTokens(),
    createMutation: useCreateOpsToken(),
    revokeMutation: useRevokeOpsToken(),
  };
}

export type OpsTokensLoader = ReturnType<typeof useOpsTokensLoader>;

export const opsTokensLoaderKey: InjectionKey<OpsTokensLoader> = Symbol("opsTokensLoader");

/** Shared loader bundle when provided by {@link OpsTokensAsync.vue}. */
export function useOpsTokensPageLoader(): OpsTokensLoader {
  return inject(opsTokensLoaderKey, null) ?? useOpsTokensLoader();
}
