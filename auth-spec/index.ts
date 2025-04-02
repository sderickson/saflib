import type { components } from "./dist/openapi.d.ts";

export type { paths, components, operations } from "./dist/openapi.d.ts";
// Re-export the schema types for easier access
export type LoginRequest = components["schemas"]["LoginRequest"];
export type RegisterRequest = components["schemas"]["RegisterRequest"];
export type UserResponse = components["schemas"]["UserResponse"];

import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types.ts";
import * as json from "./dist/openapi.json" with { type: "json" };
export const jsonSpec = (json as any).default as OpenAPIV3.DocumentV3;
