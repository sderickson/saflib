import { makeReverseTComposable } from "@saflib/vue";
import { secretsSdkStrings } from "./strings.ts";

export const useReverseT = makeReverseTComposable(secretsSdkStrings);
