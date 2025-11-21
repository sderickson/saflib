import { makeReverseTComposable } from "@saflib/vue";
import { backupSdkStrings } from "./strings.ts";

export const useReverseT = makeReverseTComposable(backupSdkStrings);
