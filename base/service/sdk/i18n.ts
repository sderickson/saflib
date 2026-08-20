import { makeReverseTComposable } from "@saflib/vue";
import { base_sdk_strings } from "./strings.ts";

export const { useReverseT } = makeReverseTComposable(base_sdk_strings);
