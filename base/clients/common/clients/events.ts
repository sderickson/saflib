import { makeProductEventLogger, commonEventLogger } from "@saflib/vue";
import { registerDevBackendProductEventConnector } from "@saflib/analytics-vue/lib/registerDevBackendProductEventConnector.ts";
import type { ProductEvent } from "@saflib/base-spec";

registerDevBackendProductEventConnector();

const baseLogger = makeProductEventLogger<ProductEvent>();
baseLogger.onProductEvent(commonEventLogger);

export const eventLogger = baseLogger;
