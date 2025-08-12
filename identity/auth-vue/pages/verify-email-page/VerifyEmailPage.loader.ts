import { useQuery } from "@tanstack/vue-query";
import { getProfile } from "../../requests/auth";
import { useRouter } from "vue-router";
import { watch } from "vue";

export function useVerifyEmailPageLoader(redirectTo: string) {
  const router = useRouter();

  const profileQuery = useQuery(getProfile());

  // Watch for profile data and redirect if email is verified
  watch(
    () => profileQuery.data.value,
    (profile) => {
      if (profile?.emailVerified) {
        const onboardingStartUrl = redirectTo;
        router.replace(onboardingStartUrl);
      }
    },
    { immediate: true },
  );

  return {
    profileQuery,
  };
}
