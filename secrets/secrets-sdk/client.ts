import { createSafClient } from "@saflib/sdk";
import type { paths } from "@saflib/secrets-spec";

export const client = createSafClient<paths>("secrets");
