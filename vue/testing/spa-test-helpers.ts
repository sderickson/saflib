import type { ComponentMountingOptions } from "@vue/test-utils";
import type { Component } from "vue";
import {
  createMemoryHistory,
  type Router,
  type RouterHistory,
} from "vue-router";
import { setClientName } from "@saflib/links";
import { mountWithPlugins } from "./mount.ts";
import type { I18nMessages } from "../src/strings.ts";

export interface CreateSpaTestHelpersOptions {
  /** When set, calls {@link setClientName} inside `mountTestApp`. */
  clientName?: string;
  createRouter: (options?: { history?: RouterHistory }) => Router;
  strings: I18nMessages;
}

/**
 * Shared `createTestRouter` / `mountTestApp` pair used by product SPA packages.
 */
export function createSpaTestHelpers(options: CreateSpaTestHelpersOptions) {
  const createTestRouter = () =>
    options.createRouter({ history: createMemoryHistory() });

  const mountTestApp = <C extends Component>(
    Component: C,
    mountOptions: ComponentMountingOptions<C> = {},
    overrides: { router?: Router } = {},
  ) => {
    if (options.clientName) {
      setClientName(options.clientName);
    }
    return mountWithPlugins(Component, mountOptions, {
      router: overrides.router ?? createTestRouter(),
      i18nMessages: {
        ...options.strings,
      },
    });
  };

  return { createTestRouter, mountTestApp };
}
