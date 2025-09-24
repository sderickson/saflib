import { mountWithPlugins } from "@saflib/vue/testing";
import type { ComponentMountingOptions } from "@vue/test-utils";
import type { Component } from "vue";
import { secretsSdkStrings } from "./strings.ts";
import { secretsServiceFakeHandlers } from "./fakes.ts";
import { router } from "./router.ts";

export const mountTestApp = <C extends Component>(
  Component: C,
  options: ComponentMountingOptions<C> = {},
) => {
  return mountWithPlugins(Component, options, {
    i18nMessages: {
      ...secretsSdkStrings,
    },
    router,
  });
};

export const testAppHandlers = [...secretsServiceFakeHandlers];
