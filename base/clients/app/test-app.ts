import { mountWithPlugins } from "@saflib/vue/testing";
import type { ComponentMountingOptions } from "@vue/test-utils";
import type { Component } from "vue";
import { createMemoryHistory, type Router } from "vue-router";
import { createAppRouter } from "./router.ts";
import { app_strings } from "./strings.ts";
import {
  resetMocks,
  baseServiceFakeHandlers,
} from "@saflib/base-sdk/fakes";
import { kratosFakeHandlers } from "@saflib/ory-kratos-sdk/fakes";

export const createTestRouter = () =>
  createAppRouter({ history: createMemoryHistory() });

export const mountTestApp = <C extends Component>(
  Component: C,
  options: ComponentMountingOptions<C> = {},
  overrides: { router?: Router } = {},
) => {
  return mountWithPlugins(Component, options, {
    router: overrides.router ?? createTestRouter(),
    i18nMessages: {
      ...app_strings,
    },
  });
};

export const testAppHandlers = [
  ...kratosFakeHandlers,
  ...baseServiceFakeHandlers,
];
export { resetMocks };
