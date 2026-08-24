import { createBackendProductEventLogger } from "@saflib/analytics-vue";
import type { ProductEvent } from "@saflib/base-spec";

export const eventLogger = createBackendProductEventLogger<ProductEvent>();
