import { makeProductEventLogger, commonEventLogger } from "@saflib/vue";
import type { ProductEvent } from "@saflib/base-spec";

const baseLogger = makeProductEventLogger<ProductEvent>();
baseLogger.onProductEvent(commonEventLogger);

export const eventLogger = baseLogger;
