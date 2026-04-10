/**
 * Rather than using the posthog-js client, I'm going to stick with the one loaded
 * by the script tag, to ensure it loads consistently and quickly.
 * However, I'll use the type!
 */

import type { PostHog } from "posthog-js";
import { ref, type Ref } from "vue";
import type { Session } from "@ory/client";
import {
  kratosEmailFromSession,
  kratosNameFromSession,
} from "@saflib/ory-kratos-sdk";

// Client features in use, and in need of mocking.
type FocusedPostHog = Pick<PostHog, "getFeatureFlag" | "onFeatureFlags">;

export function usePostHog(): FocusedPostHog {
  if ("posthog" in globalThis) {
    // @ts-expect-error - posthog is not typed
    return globalThis.posthog;
  } else {
    // mock for development, testing, etc.
    return {
      getFeatureFlag: () => "control",
      onFeatureFlags: () => () => {},
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

export function identifyToPostHog(session: Session) {
  const email = kratosEmailFromSession(session);
  const name = kratosNameFromSession(session);
  const id = session.identity?.id;
  if (!email || !id) {
    return;
  }
  if ("posthog" in globalThis && !identified) {
    // @ts-expect-error - posthog is not typed
    globalThis.posthog.identify(id, {
      id: id,
      email: email,
      firstName: name?.first,
      lastName: name?.last,
    });
    console.log("id'd to posthog", id);
    identified = true;
  }
}
