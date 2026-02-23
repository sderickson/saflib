import { mountWithPlugins } from "@saflib/vue/testing";
import type { ComponentMountingOptions } from "@vue/test-utils";
import type { Component } from "vue";
import { __product_name___sdk_strings } from "./strings.ts";
import { __serviceName__ServiceFakeHandlers } from "./fakes.ts";
import { router } from "./router.ts";

export const mountTestApp = <C extends Component>(
  Component: C,
  options: ComponentMountingOptions<C> = {},
) => {
  return mountWithPlugins(Component, options, {
    i18nMessages: {
      ...__product_name___sdk_strings,
    },
    router,
  });
};

export const testAppHandlers = [...__serviceName__ServiceFakeHandlers];
