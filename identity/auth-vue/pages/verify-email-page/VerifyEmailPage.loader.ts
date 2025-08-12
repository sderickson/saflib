import { useQuery } from "@tanstack/vue-query";
import { getProfile } from "../../requests/auth";
import { useRouter } from "vue-router";
import { linkToHref } from "@saflib/links";
import { onboardingLinks } from "@vendata/web-onboarding-links";
import { watch } from "vue";

export function useVerifyEmailPageLoader() {
  const router = useRouter();

  const profileQuery = useQuery(getProfile());

  // Watch for profile data and redirect if email is verified
  watch(
    () => profileQuery.data.value,
    (profile) => {
      if (profile?.emailVerified) {
        const onboardingStartUrl = linkToHref(onboardingLinks.getStarted);
        router.replace(onboardingStartUrl);
      }
    },
    { immediate: true },
  );

  return {
    profileQuery,
  };
}
