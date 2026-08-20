import { makeReverseTComposable } from "@saflib/vue";
import { templates_common_strings } from "./strings.ts";

export const { useReverseT } = makeReverseTComposable(
  templates_common_strings,
);
