import type { Component } from "vue";

/** Props accepted by app-provided and default async/query error renderers. */
export type AsyncPageErrorProps = {
  error?: unknown;
  message?: string;
};

export type AsyncPageErrorComponent = Component<AsyncPageErrorProps>;

export const asyncPageErrorKey: unique symbol = Symbol("asyncPageError");
