import { makeReverseTComposable } from "@saflib/vue";
import { tmpSdkStrings } from "./strings.ts";

export const useReverseT = makeReverseTComposable(tmpSdkStrings);
