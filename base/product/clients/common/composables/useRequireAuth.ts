import { watch, type MaybeRefOrGetter, toValue } from "vue";
import { navigateToLink } from "@saflib/links";
import { authLinks } from "@saflib/ory-kratos-sdk/links";
import { useKratosSession } from "@saflib/ory-kratos-sdk";

/**
 * When `required` is true, sends the user to login (with `return_to`) once the
 * session resolves unauthenticated.
 */
export function useRequireAuth(required: MaybeRefOrGetter<boolean | undefined>) {
  const { data: session, status } = useKratosSession();
  watch(
    () => [toValue(required), status.value, session.value] as const,
    ([req, st, sess]) => {
      if (typeof window === "undefined") return;
      if (!req || st !== "success") return;
      if (sess) return;
      navigateToLink(authLinks.newLogin, {
        params: { return_to: window.location.href },
      });
    },
    { immediate: true },
  );
  return { session, status };
}
