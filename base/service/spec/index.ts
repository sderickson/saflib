import type { components } from "./dist/openapi.d.ts";

export type { paths } from "./dist/openapi.d.ts";

// Export your schema types here
export type Error = components["schemas"]["Error"];
export type ProductEvent = components["schemas"]["ProductEvent"];
export type { components } from "./dist/openapi.d.ts";

/**
 * For validating Express requests and responses.
 */
export { jsonSpec } from "./dist/json-spec.ts";
