/**
 * Rather than using the posthog-js client, I'm going to stick with the one loaded
 * by the script tag, to ensure it loads consistently and quickly.
 * However, I'll use the type!
 */

import type { PostHog } from "posthog-js";
import { ref, type Ref } from "vue";
import type { User } from "@saflib/identity-spec";

// Client features in use, and in need of mocking.
type FocusedPostHog = Pick<
  PostHog,
  "getFeatureFlag" | "onFeatureFlags" | "identify" | "capture"
>;

export function usePostHog(): FocusedPostHog {
  if ("posthog" in globalThis) {
    // @ts-expect-error - posthog is not typed
    return globalThis.posthog;
  } else {
    // mock for development, testing, etc.
    return {
      getFeatureFlag: () => "control",
      onFeatureFlags: () => () => {},
      identify: () => {},
      capture: () => undefined,
    };
  }
}

type FeatureFlag = string | boolean | undefined;
export function usePostHogFeatureFlag(feature: string): Ref<FeatureFlag> {
  const posthog = usePostHog();
  const flag: Ref<FeatureFlag> = ref(undefined);
  posthog.onFeatureFlags(() => {
    flag.value = usePostHog().getFeatureFlag(feature);
    console.log(`Feature flags loaded, flag for ${feature} is ${flag.value}`);
  });
  return flag;
}

let identified = false;

export function identifyToPostHog(user: User) {
  if ("posthog" in globalThis && !identified) {
    // @ts-expect-error - posthog is not typed
    globalThis.posthog.identify(user.id, {
      id: user.id,
      email: user.email,
      name: ((user.givenName || "") + " " + (user.familyName || "")).trim(),
      givenName: user.givenName,
      familyName: user.familyName,
    });
    identified = true;
  }
}
