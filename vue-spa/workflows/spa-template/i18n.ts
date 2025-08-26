import { makeReverseTComposable } from "@saflib/vue-spa";
import { templateFileStrings } from "./strings.ts";

export const useReverseT = makeReverseTComposable(templateFileStrings);
