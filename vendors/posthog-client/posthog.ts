/**
 * Vue helpers that talk to the **global** PostHog client (`globalThis.posthog`).
 *
 * That global is set either by {@link makePosthogScriptTag} (snippet + array.js)
 * or, in CSP-friendly SPAs, by {@link initPostHogIfConfigured} after bundling
 * `posthog-js` (ESM init does not attach to `window` by itself).
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

interface IdentifyToPostHogOptions {
  sendEmail?: boolean;
  sendName?: boolean;
}

export function identifyToPostHog(
  session: Session,
  options: IdentifyToPostHogOptions = {},
) {
  const email = kratosEmailFromSession(session);
  const name = kratosNameFromSession(session);
  const sendEmail = options.sendEmail ?? true;
  const sendName = options.sendName ?? true;
  const id = session.identity?.id;
  if (!email || !id) {
    return;
  }
  // @ts-expect-error - posthog is not typed
  if ("posthog" in globalThis && globalThis.posthog.identify && !identified) {
    const userProps = {
      id: id,
      email: sendEmail ? email : undefined,
      firstName: sendName ? name?.first : undefined,
      lastName: sendName ? name?.last : undefined,
    };
    // @ts-expect-error - posthog is not typed
    globalThis.posthog.identify(id, userProps);
    console.log("id'd to posthog", id);
    identified = true;
  }
}
