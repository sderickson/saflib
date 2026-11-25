import { mountWithPlugins } from "@saflib/vue/testing";
import type { ComponentMountingOptions } from "@vue/test-utils";
import type { Component } from "vue";

export const mountTestApp = <C extends Component>(
  Component: C,
  options: ComponentMountingOptions<C> = {},
) => mountWithPlugins(Component, options);
