import { get__IntegrationName__Client } from "../client.ts";

/**
 * A read-only API call to verify the integration is working.
 * TODO: Replace with a real read-only method from the SDK (e.g. list, get, search).
 */
export async function ping() {
  void get__IntegrationName__Client();
  return { ok: true };
}
