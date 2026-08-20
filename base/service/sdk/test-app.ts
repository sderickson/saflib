import { mountWithPlugins } from "@saflib/vue/testing";
import type { ComponentMountingOptions } from "@vue/test-utils";
import type { Component } from "vue";
import { base_sdk_strings } from "./strings.ts";
import { baseServiceFakeHandlers } from "./fakes.ts";
import { kratosFakeHandlers } from "@saflib/ory-kratos-sdk/fakes";
import { router } from "./router.ts";
import { resetMocks } from "./fakes.ts";

export const mountTestApp = <C extends Component>(
  Component: C,
  options: ComponentMountingOptions<C> = {},
) => {
  return mountWithPlugins(Component, options, {
    i18nMessages: {
      ...base_sdk_strings,
    },
    router,
  });
};

export const testAppHandlers = [...kratosFakeHandlers, ...baseServiceFakeHandlers];
export { resetMocks };