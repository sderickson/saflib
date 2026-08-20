import { mountWithPlugins } from "@saflib/vue/testing";
import type { ComponentMountingOptions } from "@vue/test-utils";
import type { Component } from "vue";
import { createMemoryHistory, type Router } from "vue-router";
import { createAdminRouter } from "./router.ts";
import { admin_strings } from "./strings.ts";
import {
  resetMocks,
  templatesServiceFakeHandlers,
} from "@saflib/templates-sdk/fakes";
import { kratosFakeHandlers } from "@saflib/ory-kratos-sdk/fakes";

export const createTestRouter = () =>
  createAdminRouter({ history: createMemoryHistory() });

export const mountTestApp = <C extends Component>(
  Component: C,
  options: ComponentMountingOptions<C> = {},
  overrides: { router?: Router } = {},
) => {
  return mountWithPlugins(Component, options, {
    router: overrides.router ?? createTestRouter(),
    i18nMessages: {
      ...admin_strings,
    },
  });
};

export const testAppHandlers = [
  ...kratosFakeHandlers,
  ...templatesServiceFakeHandlers,
];
export { resetMocks };
