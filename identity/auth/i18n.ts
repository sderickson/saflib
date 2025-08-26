import { makeReverseTComposable } from "@saflib/vue-spa";
import { authAppStrings } from "./strings.ts";
console.log("used reverse t!");

export const useReverseT = makeReverseTComposable(authAppStrings);
