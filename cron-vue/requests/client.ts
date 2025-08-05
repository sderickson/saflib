import type { paths } from "@saflib/cron-spec";
import { createSafClient } from "@saflib/vue-spa";

export const client = createSafClient<paths>("caller");
