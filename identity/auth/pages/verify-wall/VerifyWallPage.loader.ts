import { useQuery } from "@tanstack/vue-query";
import { getProfile } from "../../requests/auth";
import { watch } from "vue";
import { safeRedirect } from "../../redirect";

export function useVerifyWallPageLoader(redirectTo: string | undefined) {
  const profileQuery = useQuery(getProfile());

  // Watch for profile data and redirect if email is verified
  watch(
    () => profileQuery.data.value,
    (profile) => {
      if (profile?.emailVerified) {
        safeRedirect(redirectTo ?? "/");
      }
    },
    { immediate: true },
  );

  return {
    profileQuery,
  };
}
