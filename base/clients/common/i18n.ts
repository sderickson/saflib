import { makeReverseTComposable } from "@saflib/vue";
import { base_common_strings } from "./strings.ts";

export const { useReverseT } = makeReverseTComposable(
  base_common_strings,
);
