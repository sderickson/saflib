import { makeReverseTComposable } from "@saflib/vue";
import { auth_strings } from "./strings.ts";

export const useReverseT = makeReverseTComposable(auth_strings);
