import { useQuery } from "@tanstack/vue-query";
import { getProfile } from "../../requests/auth";
import { watch } from "vue";

export function useVerifyWallPageLoader(redirectTo: string) {
  const profileQuery = useQuery(getProfile());

  // Watch for profile data and redirect if email is verified
  watch(
    () => profileQuery.data.value,
    (profile) => {
      if (profile?.emailVerified) {
        window.location.href = redirectTo;
      }
    },
    { immediate: true },
  );

  return {
    profileQuery,
  };
}
