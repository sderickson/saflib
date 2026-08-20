import { makeReverseTComposable } from "@saflib/vue";
import { app_strings } from "./strings.ts";

export const { useReverseT } = makeReverseTComposable(
  app_strings,
);
