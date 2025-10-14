import { makeReverseTComposable } from "@saflib/vue";
import { accountSdkStrings } from "./strings.ts";

export const useReverseT = makeReverseTComposable(accountSdkStrings);
