import { createSafClient } from "@saflib/sdk";
import type { paths } from "example-spec";

export const client = createSafClient<paths>("example");
