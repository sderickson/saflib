import type { PostHogConfig } from "posthog-js";

/**
 * Text masking for PostHog session replay. Not used by any product right now:
 * replay records far more than events, so it should get its own explicit
 * consent, separate from agreeing to product analytics. Kept here so replay
 * can be turned back on later with the same masking.
 *
 * To use it, merge {@link sessionRecordingMaskingOptions} into `posthog.init`
 * (or `initPostHogIfConfigured`) along with `disable_session_recording: false`.
 */

/**
 * Builds a masker that keeps the app's own UI strings readable in recordings
 * and replaces everything else (user and client data) with asterisks. Pass the
 * app's `stringToKeyMap` from `makeReverseTComposable` (`@saflib/vue`): text
 * that exactly matches a known UI string stays visible.
 */
export function makeSessionRecordingTextMasker(knownStrings: {
  get(text: string): unknown;
}): (text: string) => string {
  return (text) => (knownStrings.get(text) ? text : "*".repeat(text.length));
}

/**
 * PostHog options that run every text node through `maskText`. Without a
 * masker, all text is replaced with asterisks.
 */
export function sessionRecordingMaskingOptions(
  maskText: (text: string) => string = (text) => "*".repeat(text.length),
): Pick<PostHogConfig, "session_recording"> {
  return {
    session_recording: {
      maskTextSelector: "*",
      maskTextFn: maskText,
    },
  };
}
