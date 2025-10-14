import { mountWithPlugins } from "@saflib/vue/testing";
import type { ComponentMountingOptions } from "@vue/test-utils";
import type { Component } from "vue";
import { router } from "./test-router.ts";
import { accountSdkStrings } from "./strings.ts";

export const mountTestApp = <C extends Component>(
  Component: C,
  options: ComponentMountingOptions<C> = {},
) => {
  return mountWithPlugins(Component, options, {
    router,
    i18nMessages: {
      ...accountSdkStrings,
    },
  });
};
