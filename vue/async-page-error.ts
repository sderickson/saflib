import type { Component, InjectionKey } from "vue";

/** Props accepted by app-provided and default async/query error renderers. */
export type AsyncPageErrorProps = {
  error?: unknown;
  message?: string;
};

export type AsyncPageErrorComponent = Component<AsyncPageErrorProps>;

export const asyncPageErrorKey: unique symbol = Symbol("asyncPageError");

/** Account (or other) URL shown when a page load fails with `MFA_REQUIRED`. */
export const mfaRequiredHrefKey: InjectionKey<string> = Symbol("mfaRequiredHref");
