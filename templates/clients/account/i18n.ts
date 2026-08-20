import { makeReverseTComposable } from "@saflib/vue";
import { account_strings } from "./strings.ts";

export const { useReverseT } = makeReverseTComposable(
  account_strings,
);
