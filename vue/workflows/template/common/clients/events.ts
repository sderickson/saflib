import { commonEventLogger, makeProductEventLogger } from "@saflib/vue";
import type { ProductEvent } from "template-package-spec";

export const eventLogger = makeProductEventLogger<ProductEvent>();
eventLogger.onProductEvent(commonEventLogger<ProductEvent>);
