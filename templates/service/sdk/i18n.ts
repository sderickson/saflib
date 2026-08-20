import { makeReverseTComposable } from "@saflib/vue";
import { templates_sdk_strings } from "./strings.ts";

export const { useReverseT } = makeReverseTComposable(templates_sdk_strings);
