import type { operations } from "./dist/openapi.d.ts";

export type { paths, components, operations } from "./dist/openapi.d.ts";
import {
  ExtractResponseSchema,
  ExtractRequestSchema,
} from "@saflib/openapi-specs";

export type AuthResponse = ExtractResponseSchema<operations>;
export type AuthRequest = ExtractRequestSchema<operations>;

import type { OpenAPIV3 } from "express-openapi-validator/dist/framework/types.ts";
import * as json from "./dist/openapi.json" with { type: "json" };
export const jsonSpec = (json as any).default as OpenAPIV3.DocumentV3;
