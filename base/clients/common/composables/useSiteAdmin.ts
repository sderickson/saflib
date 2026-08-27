import { computed } from "vue";
import {
  kratosEmailFromSession,
  kratosEmailVerifiedFromSession,
  useKratosSession,
} from "@saflib/ory-kratos-sdk";
import { isSiteAdminEmail } from "#utils/site-admin.logic.ts";

/** True when the session email is a verified site-admin (nav chrome only). */
export function useSiteAdmin() {
  const { data: session } = useKratosSession();

  const isSiteAdmin = computed(() => {
    const email = kratosEmailFromSession(session.value);
    if (!isSiteAdminEmail(email)) {
      return false;
    }
    return kratosEmailVerifiedFromSession(session.value);
  });

  return { isSiteAdmin };
}
