import { makeReverseTComposable } from "@saflib/vue";
import { sdkStrings } from "./strings.ts";

export const useReverseT = makeReverseTComposable(sdkStrings);
