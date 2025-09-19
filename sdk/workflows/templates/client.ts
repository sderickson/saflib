import { createSafClient } from "@saflib/sdk";
import type { paths } from "@template/file-spec";

export const client = createSafClient<paths>("service-name");
