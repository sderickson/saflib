import { getSafReporters } from "@saflib/node";
import type { KratosActionHandler } from "@saflib/ory-kratos-http";

/**
 * Default action handler for base. Logs the body at info level.
 * Replace or extend this when the product wires in audit logging, metrics,
 * or other fan-out — all consumers should compose inside this dispatcher.
 */
export const makeKratosActionHandler = (): KratosActionHandler => ({
  onAction: async (action) => {
    const { log } = getSafReporters();
    log.info("kratos action received", { action });
  },
});
