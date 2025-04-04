import type { paths } from "@saflib/auth-spec";
import { createSafClient } from "@saflib/vue-spa";

export const client = createSafClient<paths>("api");
