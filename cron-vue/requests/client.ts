import type { paths } from "@saflib/cron-spec";
import { createSafClient } from "@saflib/vue-spa";

// TODO: fix this
export const client = createSafClient<paths>("caller");
