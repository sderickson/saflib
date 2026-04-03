import { configureSecretStore } from "./secrets.ts";

let initialized = false;

/**
 * Initializes all process-level dependencies for the __service-name__ service:
 * secret store, then integration clients that need secrets.
 *
 * Idempotent — safe to call from multiple entry points (HTTP, cron, CLI).
 * Must be awaited before serving requests.
 *
 * Add integration configuration here as you add integrations, e.g.:
 *
 * ```ts
 * import { configure(IntegrationName) } from "template-integration";
 * // ... inside initializeDependencies:
 * await configure(IntegrationName)(getSecretStore());
 * ```
 */
export async function initializeDependencies(): Promise<void> {
  if (initialized) return;

  configureSecretStore();

  initialized = true;
}
