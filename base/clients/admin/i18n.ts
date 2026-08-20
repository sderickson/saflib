import { makeReverseTComposable } from "@saflib/vue";
import { admin_strings } from "./strings.ts";

export const { useReverseT } = makeReverseTComposable(
  admin_strings,
);
