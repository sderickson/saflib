import { isDevelopmentDeployment } from "./deployment.ts";

/**
 * Belt-and-suspenders guard for dev-only observability handlers. Routers should
 * only be mounted in development; if this throws outside dev, treat it as a
 * server misconfiguration (not a client-facing 403).
 */
export function assertDevelopmentObservabilityAvailable(
  feature = "Dev observability",
): void {
  if (!isDevelopmentDeployment()) {
    throw new Error(`${feature} is only available in development`);
  }
}
