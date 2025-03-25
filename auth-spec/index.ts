import type { components } from "./dist/openapi.d.ts";

export type { paths, components, operations } from "./dist/openapi.d.ts";
// Re-export the schema types for easier access
export type LoginRequest = components["schemas"]["LoginRequest"];
export type RegisterRequest = components["schemas"]["RegisterRequest"];
export type UserResponse = components["schemas"]["UserResponse"];
