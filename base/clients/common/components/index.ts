// keep form, layout, and display components shared across SPAs in this folder, and re-export them from here
export { default as BaseLayout } from "./base-layout/BaseLayout.vue";
export { default as DynamicBaseLayout } from "./base-layout/DynamicBaseLayout.vue";
export { default as BaseAsyncPageError } from "./BaseAsyncPageError.vue";
export {
  baseAccessErrorAction,
  baseVerifyEmailHref,
  isEmailVerificationRequiredError,
  resolveBaseAccessErrorKind,
} from "#utils/access-error.logic.ts";
export type { BaseAccessErrorKind } from "#utils/access-error.logic.ts";
