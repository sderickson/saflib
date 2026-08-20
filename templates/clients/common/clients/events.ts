import { commonEventLogger, makeProductEventLogger } from "@saflib/vue";
import type { ProductEvent } from "@saflib/templates-spec";

export const eventLogger = makeProductEventLogger<ProductEvent>();
eventLogger.onProductEvent(commonEventLogger<ProductEvent>);
