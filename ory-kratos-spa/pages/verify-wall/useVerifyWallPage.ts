import type { UseQueryReturnType } from "@tanstack/vue-query";
import type { Session } from "@ory/client";
import { computed, watch } from "vue";
import { useRoute } from "vue-router";
import { linkToHrefWithHost, navigateToLink } from "@saflib/links";
import { authLinks } from "@saflib/ory-kratos-sdk/links";
import { useAuthPostRegisterFallbackHref } from "../../authFallbackInject.ts";
import { identityNeedsEmailVerification } from "@saflib/ory-kratos-sdk";
import {
  resolveVerifyWallReturnToDestination,
  sessionDisplayEmail,
} from "./VerifyWall.logic.ts";

/**
 * Route side effects and derived state for the verify wall: redirect unauthenticated users to login,
 * and expose copy for unverified vs verified sessions.
 */
export function useVerifyWallPage(
  sessionQuery: UseQueryReturnType<Session | null, Error>,
) {
  const route = useRoute();
  const postRegisterFallbackHref = useAuthPostRegisterFallbackHref();

  const redirectAfter = computed(() =>
    resolveVerifyWallReturnToDestination(
      route.query.return_to,
      postRegisterFallbackHref.value,
    ),
  );

  const verifyWallReturnHref = computed(() => {
    const r = route.query.return_to;
    if (typeof r === "string" && r.trim()) {
      return linkToHrefWithHost(authLinks.verifyWall, {
        params: { return_to: r.trim() },
      });
    }
    return linkToHrefWithHost(authLinks.verifyWall);
  });

  watch(
    () => sessionQuery.data.value,
    (session) => {
      if (sessionQuery.status.value !== "success") return;
      if (session == null) {
        navigateToLink(authLinks.newLogin, {
          params: { return_to: verifyWallReturnHref.value },
        });
      }
    },
    { immediate: true },
  );

  const showVerifiedWall = computed(() => {
    const session = sessionQuery.data.value;
    if (!session) return false;
    return !identityNeedsEmailVerification(session.identity);
  });

  const showUnverifiedWall = computed(() => {
    const session = sessionQuery.data.value;
    if (!session) return false;
    return identityNeedsEmailVerification(session.identity);
  });

  const identityEmail = computed(() => {
    const session = sessionQuery.data.value;
    if (!session) return "";
    return sessionDisplayEmail(session);
  });

  return {
    showVerifiedWall,
    showUnverifiedWall,
    identityEmail,
    redirectAfter,
  };
}
