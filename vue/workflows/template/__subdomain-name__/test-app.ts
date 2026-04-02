import { mountWithPlugins } from "@saflib/vue/testing";
import type { ComponentMountingOptions } from "@vue/test-utils";
import type { Component } from "vue";
import { createMemoryHistory, type Router } from "vue-router";
import { create__SubdomainName__Router } from "./router.ts";
import { __subdomain_name___strings } from "./strings.ts";
import {
  resetMocks,
  __serviceName__ServiceFakeHandlers,
} from "template-package-sdk/fakes";
import { kratosFakeHandlers } from "@saflib/ory-kratos-sdk/fakes";

export const createTestRouter = () =>
  create__SubdomainName__Router({ history: createMemoryHistory() });

export const mountTestApp = <C extends Component>(
  Component: C,
  options: ComponentMountingOptions<C> = {},
  overrides: { router?: Router } = {},
) => {
  return mountWithPlugins(Component, options, {
    router: overrides.router ?? createTestRouter(),
    i18nMessages: {
      ...__subdomain_name___strings,
    },
  });
};

export const testAppHandlers = [
  ...kratosFakeHandlers,
  ...__serviceName__ServiceFakeHandlers,
];
export { resetMocks };
