/**
 * Mock client for tests and when credentials use the `"mock"` sentinel.
 *
 * **SDK-free:** do not value-import vendor SDK packages here. Use `import type`
 * only, or declare local response shapes in `client.types.ts`. Production SDK
 * wiring belongs in `client.real.ts` (see @pathclerk/daemon-anthropic for the
 * reference split).
 */
import type { Scoped__IntegrationName__Client } from "./client.ts";

// TODO: Implement mock responses returning realistic placeholder data.
// Each method in the scoped client type needs a mock that returns the
// correct response shape. Keep mocks minimal but structurally accurate.

export const mock__IntegrationName__Client: Scoped__IntegrationName__Client = {};
