import { createSafClient } from "@saflib/sdk";
import type { paths } from "template-package-spec";

export const client = createSafClient<paths>("__service-name__");
