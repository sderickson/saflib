import { makeReverseTComposable } from "@saflib/vue-spa";
import { authAppStrings } from "./strings.ts";

export const useReverseT = makeReverseTComposable(authAppStrings);
