import type { paths } from "@saflib/identity-spec";
import { createSafClient } from "@saflib/vue-spa";

export const client = createSafClient<paths>("identity");
