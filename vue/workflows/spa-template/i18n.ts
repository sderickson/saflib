import { makeReverseTComposable } from "@saflib/vue";
import { templateFileStrings } from "./strings.ts";

export const useReverseT = makeReverseTComposable(templateFileStrings);
