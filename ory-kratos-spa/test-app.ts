import { mountWithPlugins } from "@saflib/vue/testing";
import type { ComponentMountingOptions } from "@vue/test-utils";
import type { Component } from "vue";
import { createMemoryHistory, type Router } from "vue-router";
import { createAuthRouter } from "./router.ts";
import { auth_strings } from "./strings.ts";
import { kratosFakeHandlers } from "@saflib/ory-kratos-sdk/fakes";

export const createTestRouter = () =>
  createAuthRouter({ history: createMemoryHistory() });

export const mountTestApp = <C extends Component>(
  Component: C,
  options: ComponentMountingOptions<C> = {},
  overrides: { router?: Router } = {},
) => {
  return mountWithPlugins(Component, options, {
    router: overrides.router ?? createTestRouter(),
    i18nMessages: {
      ...auth_strings,
    },
  });
};

export const testAppHandlers = [...kratosFakeHandlers];
